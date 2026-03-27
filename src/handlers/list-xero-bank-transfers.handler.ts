import { xeroClient } from "../clients/xero-client.js";
import { BankTransfer } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { assertDate } from "../helpers/validate-inputs.js";

async function getBankTransfers(
  fromDate?: string,
  toDate?: string,
): Promise<BankTransfer[]> {
  await xeroClient.authenticate();

  if (fromDate) assertDate(fromDate, "fromDate");
  if (toDate) assertDate(toDate, "toDate");

  const conditions: string[] = [];
  if (fromDate) {
    const [y, m, d] = fromDate.split("-");
    conditions.push(`Date>=DateTime(${y},${m},${d})`);
  }
  if (toDate) {
    const [y, m, d] = toDate.split("-");
    conditions.push(`Date<=DateTime(${y},${m},${d})`);
  }
  const where = conditions.length > 0 ? conditions.join(" AND ") : undefined;

  const response = await xeroClient.accountingApi.getBankTransfers(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    where,
    "Date DESC",
    getClientHeaders(),
  );

  return response.body.bankTransfers ?? [];
}

export async function listXeroBankTransfers(
  fromDate?: string,
  toDate?: string,
): Promise<XeroClientResponse<BankTransfer[]>> {
  try {
    const transfers = await getBankTransfers(fromDate, toDate);
    return { result: transfers, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
