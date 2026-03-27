import { xeroClient } from "../clients/xero-client.js";
import { RepeatingInvoice } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function getRepeatingInvoices(): Promise<RepeatingInvoice[]> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getRepeatingInvoices(
    xeroClient.tenantId,
    undefined, // where
    undefined, // order
    getClientHeaders(),
  );

  return response.body.repeatingInvoices ?? [];
}

export async function listXeroRepeatingInvoices(): Promise<
  XeroClientResponse<RepeatingInvoice[]>
> {
  try {
    const invoices = await getRepeatingInvoices();
    return { result: invoices, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
