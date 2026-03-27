import { xeroClient } from "../clients/xero-client.js";
import { BankTransaction } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { assertDate, assertUuid } from "../helpers/validate-inputs.js";

export interface BankTransactionFilters {
  bankAccountId?: string;
  contactId?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
}

function buildWhereClause(filters: BankTransactionFilters): string | undefined {
  // Validate all inputs before they touch the WHERE string
  if (filters.bankAccountId) assertUuid(filters.bankAccountId, "bankAccountId");
  if (filters.contactId) assertUuid(filters.contactId, "contactId");
  if (filters.fromDate) assertDate(filters.fromDate, "fromDate");
  if (filters.toDate) assertDate(filters.toDate, "toDate");

  const conditions: string[] = [];

  if (filters.bankAccountId) {
    conditions.push(`BankAccount.AccountID=Guid("${filters.bankAccountId}")`);
  }
  if (filters.contactId) {
    conditions.push(`Contact.ContactID=Guid("${filters.contactId}")`);
  }
  if (filters.fromDate) {
    const [year, month, day] = filters.fromDate.split("-");
    conditions.push(`Date>=DateTime(${year},${month},${day})`);
  }
  if (filters.toDate) {
    const [year, month, day] = filters.toDate.split("-");
    conditions.push(`Date<=DateTime(${year},${month},${day})`);
  }

  return conditions.length > 0 ? conditions.join(" AND ") : undefined;
}

async function getBankTransactions(
  page: number,
  filters: BankTransactionFilters,
): Promise<BankTransaction[]> {
  await xeroClient.authenticate();

  const where = buildWhereClause(filters);

  const response = await xeroClient.accountingApi.getBankTransactions(
    xeroClient.tenantId,
    undefined,   // ifModifiedSince
    where,       // where
    "Date DESC", // order
    page,        // page
    undefined,   // unitdp
    100,         // pageSize — increased from 10 to reduce round-trips
    getClientHeaders(),
  );

  return response.body.bankTransactions ?? [];
}

export async function listXeroBankTransactions(
  page: number = 1,
  filters: BankTransactionFilters = {},
): Promise<XeroClientResponse<BankTransaction[]>> {
  try {
    const bankTransactions = await getBankTransactions(page, filters);

    return {
      result: bankTransactions,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

/**
 * Fetch ALL bank transactions for a contact within a date range,
 * automatically paginating until no more results are returned.
 */
export async function listAllBankTransactionsForContact(
  contactId: string,
  fromDate?: string,
  toDate?: string,
): Promise<XeroClientResponse<BankTransaction[]>> {
  try {
    const allTransactions: BankTransaction[] = [];
    let page = 1;

    while (true) {
      const batch = await getBankTransactions(page, {
        contactId,
        fromDate,
        toDate,
      });

      allTransactions.push(...batch);

      // If fewer records than page size we've reached the end
      if (batch.length < 100) break;
      page++;
    }

    return {
      result: allTransactions,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}
