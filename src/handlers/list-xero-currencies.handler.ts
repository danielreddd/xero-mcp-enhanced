import { xeroClient } from "../clients/xero-client.js";
import { Currency } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function getCurrencies(): Promise<Currency[]> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getCurrencies(
    xeroClient.tenantId,
    undefined, // where
    undefined, // order
    getClientHeaders(),
  );

  return response.body.currencies ?? [];
}

export async function listXeroCurrencies(): Promise<
  XeroClientResponse<Currency[]>
> {
  try {
    const currencies = await getCurrencies();
    return { result: currencies, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
