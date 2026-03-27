/**
 * Debug script — run this to see exactly what the token request sends and
 * what Xero responds with.
 *
 * Usage:
 *   XERO_CLIENT_ID=xxx XERO_CLIENT_SECRET=yyy node debug-auth.mjs
 *
 * Or create a .env file first and run:
 *   node --require dotenv/config debug-auth.mjs     (CommonJS dotenv)
 *   node debug-auth.mjs                              (reads .env manually below)
 */

import { readFileSync } from "fs";
import { createRequire } from "module";

// Manually load .env if present
try {
  const env = readFileSync(".env", "utf-8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) process.env[key.trim()] = rest.join("=").trim();
  }
  console.log("Loaded .env");
} catch {
  console.log("No .env file found — using existing environment variables");
}

const clientId = process.env.XERO_CLIENT_ID;
const clientSecret = process.env.XERO_CLIENT_SECRET;
const explicitScopes = process.env.XERO_SCOPES;

if (!clientId || !clientSecret) {
  console.error("ERROR: XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set");
  process.exit(1);
}

const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

// Test 1: No scope parameter
console.log("\n=== TEST 1: No scope parameter ===");
{
  const body = "grant_type=client_credentials";
  console.log("Request body:", body);

  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const data = await res.json();
  console.log("Status:", res.status);
  if (res.ok) {
    console.log("SUCCESS — scopes in token:");
    // Decode the JWT payload to see what scopes were granted
    try {
      const payload = JSON.parse(
        Buffer.from(data.access_token.split(".")[1], "base64url").toString(),
      );
      console.log("  scope:", payload.scope);
      console.log("  expires_in:", data.expires_in);
    } catch {
      console.log("  (could not decode JWT payload)");
      console.log("  expires_in:", data.expires_in);
    }
  } else {
    console.log("FAILED — response:", JSON.stringify(data, null, 2));
  }
}

// Test 2: With explicit scopes from env (if set)
if (explicitScopes) {
  console.log("\n=== TEST 2: Explicit XERO_SCOPES ===");
  const body = `grant_type=client_credentials&scope=${encodeURIComponent(explicitScopes)}`;
  console.log("Request body:", body);

  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const data = await res.json();
  console.log("Status:", res.status);
  if (res.ok) {
    console.log("SUCCESS — expires_in:", data.expires_in);
  } else {
    console.log("FAILED — response:", JSON.stringify(data, null, 2));
  }
} else {
  console.log("\n(Skipping Test 2 — XERO_SCOPES not set)");
}

// Test 3: Fetch connections to get tenant ID
console.log("\n=== If Test 1 succeeded, also checking /connections ===");
{
  const tokenBody = "grant_type=client_credentials";
  const tokenRes = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
  });

  if (tokenRes.ok) {
    const tokenData = await tokenRes.json();
    const connRes = await fetch("https://api.xero.com/connections", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });
    const connData = await connRes.json();
    console.log("Connections status:", connRes.status);
    console.log("Connections response:", JSON.stringify(connData, null, 2));
  }
}
