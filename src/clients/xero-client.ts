import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import {
  IXeroClientConfig,
  Organisation,
  TokenSet,
  XeroClient,
} from "xero-node";

import { ensureError } from "../helpers/ensure-error.js";

dotenv.config();

const client_id = process.env.XERO_CLIENT_ID;
const client_secret = process.env.XERO_CLIENT_SECRET;
const bearer_token = process.env.XERO_CLIENT_BEARER_TOKEN;
const grant_type = "client_credentials";

// Scopes for the client credentials token request.
// By default omitted so Xero returns a token with whatever scopes the Custom
// Connection app was configured with. Set XERO_SCOPES to override.
const SCOPES: string | undefined = process.env.XERO_SCOPES ?? undefined;

// How many seconds before token expiry we proactively refresh.
const REFRESH_BUFFER_SECONDS = 60;

abstract class MCPXeroClient extends XeroClient {
  public tenantId: string;
  private shortCode: string;

  protected constructor(config?: IXeroClientConfig) {
    super(config);
    this.tenantId = "";
    this.shortCode = "";
  }

  public abstract authenticate(): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override async updateTenants(fullOrgDetails?: boolean): Promise<any[]> {
    await super.updateTenants(fullOrgDetails);
    if (this.tenants && this.tenants.length > 0) {
      this.tenantId = this.tenants[0].tenantId;
    }
    return this.tenants;
  }

  private async getOrganisation(): Promise<Organisation> {
    await this.authenticate();

    const organisationResponse = await this.accountingApi.getOrganisations(
      this.tenantId || "",
    );

    const organisation = organisationResponse.body.organisations?.[0];

    if (!organisation) {
      throw new Error("Failed to retrieve organisation");
    }

    return organisation;
  }

  public async getShortCode(): Promise<string | undefined> {
    if (!this.shortCode) {
      try {
        const organisation = await this.getOrganisation();
        this.shortCode = organisation.shortCode ?? "";
      } catch (error: unknown) {
        const err = ensureError(error);

        throw new Error(
          `Failed to get Organisation short code: ${err.message}`,
        );
      }
    }
    return this.shortCode;
  }
}

class CustomConnectionsXeroClient extends MCPXeroClient {
  private readonly clientId: string;
  private readonly clientSecret: string;

  // Token cache: store the access token and its expiry timestamp (ms since epoch)
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: {
    clientId: string;
    clientSecret: string;
    grantType: string;
  }) {
    super(config);
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private isTokenValid(): boolean {
    if (!this.cachedToken) return false;
    const nowSeconds = Date.now() / 1000;
    return this.tokenExpiresAt - nowSeconds > REFRESH_BUFFER_SECONDS;
  }

  public async getClientCredentialsToken(): Promise<TokenSet> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString("base64");

    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      if (SCOPES) params.append("scope", SCOPES);

      const body = params.toString();

      const response = await axios.post(
        "https://identity.xero.com/connect/token",
        body,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        },
      );

      // Get the tenant ID from the connections endpoint
      const token = response.data.access_token;
      const connectionsResponse = await axios.get(
        "https://api.xero.com/connections",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (connectionsResponse.data && connectionsResponse.data.length > 0) {
        this.tenantId = connectionsResponse.data[0].tenantId;
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const detail =
        typeof axiosError.response?.data === "object"
          ? JSON.stringify(axiosError.response?.data)
          : axiosError.response?.data;
      throw new Error(
        `Failed to get Xero token: ${detail ?? axiosError.message}`,
      );
    }
  }

  public async authenticate() {
    if (!client_id || !client_secret) {
      throw new Error(
        "XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set in your environment. " +
        "Check your Claude Desktop MCP config or .env file.",
      );
    }

    // Reuse the cached token if it is still valid
    if (this.isTokenValid()) return;

    const tokenResponse = await this.getClientCredentialsToken();

    this.cachedToken = tokenResponse.access_token ?? null;
    // expires_in is in seconds; record absolute expiry as seconds-since-epoch
    this.tokenExpiresAt = Date.now() / 1000 + (tokenResponse.expires_in ?? 1800);

    this.setTokenSet({
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in,
      token_type: tokenResponse.token_type,
    });
  }
}

class BearerTokenXeroClient extends MCPXeroClient {
  private readonly bearerToken: string;

  constructor(config: { bearerToken: string }) {
    super();
    this.bearerToken = config.bearerToken;
  }

  async authenticate(): Promise<void> {
    // Decode the JWT (no signature check) to detect expiry and warn
    try {
      const parts = this.bearerToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8"),
        );
        if (payload.exp) {
          const secondsRemaining = payload.exp - Date.now() / 1000;
          if (secondsRemaining <= 0) {
            console.error(
              "[xero-mcp-enhanced] WARNING: XERO_CLIENT_BEARER_TOKEN has expired. " +
                "Please obtain a new token from https://developer.xero.com/tokenviewer",
            );
          } else if (secondsRemaining < 120) {
            console.error(
              `[xero-mcp-enhanced] WARNING: XERO_CLIENT_BEARER_TOKEN expires in ` +
                `${Math.round(secondsRemaining)} seconds. Consider refreshing it soon.`,
            );
          }
        }
      }
    } catch {
      // Non-fatal — ignore JWT parse errors
    }

    this.setTokenSet({
      access_token: this.bearerToken,
    });

    await this.updateTenants();
  }
}

export const xeroClient = bearer_token
  ? new BearerTokenXeroClient({
      bearerToken: bearer_token,
    })
  : new CustomConnectionsXeroClient({
      clientId: client_id!,
      clientSecret: client_secret!,
      grantType: grant_type,
    });
