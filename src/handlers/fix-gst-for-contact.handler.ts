import { xeroClient } from "../clients/xero-client.js";
import { BankTransaction } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { listAllBankTransactionsForContact } from "./list-xero-bank-transactions.handler.js";

// Xero rate limit: ~60 calls/minute. Pause between writes to stay well under.
const INTER_REQUEST_DELAY_MS = 1100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GstFixResult {
  bankTransactionId: string;
  date: string | undefined;
  reference: string | undefined;
  total: number | undefined;
  status: "updated" | "skipped" | "error";
  message: string;
}

export interface GstFixSummary {
  contactId: string;
  fromDate: string | undefined;
  toDate: string | undefined;
  newTaxType: string;
  results: GstFixResult[];
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
}

async function updateTaxTypeOnTransaction(
  transaction: BankTransaction,
  newTaxType: string,
): Promise<{ status: "updated" | "error"; message: string }> {
  const bankTransactionId = transaction.bankTransactionID!;

  if (!transaction.lineItems || transaction.lineItems.length === 0) {
    return { status: "error", message: "No line items found on transaction" };
  }

  const updatedLineItems = transaction.lineItems.map((li) => ({
    ...li,
    taxType: newTaxType,
  }));

  // Minimal payload — only the fields being changed.
  // Note: Xero's API does not allow editing transactions that have been
  // reconciled with a bank statement. Those will return a clear error:
  // "This Bank Transaction cannot be edited as it has been reconciled
  // with a Bank Statement." Unreconcile them in the Xero UI first.
  const updatePayload = {
    bankTransactionID: bankTransactionId,
    lineItems: updatedLineItems,
  } as unknown as BankTransaction;

  try {
    await xeroClient.accountingApi.updateBankTransaction(
      xeroClient.tenantId,
      bankTransactionId,
      { bankTransactions: [updatePayload] },
      undefined,
      undefined,
      getClientHeaders(),
    );

    return { status: "updated", message: "Updated successfully" };
  } catch (error) {
    return { status: "error", message: formatError(error) };
  }
}

/**
 * Find all bank transactions for a contact within a date range and update the
 * tax type on every line item of each transaction.
 *
 * Transactions whose status is DELETED or VOIDED are skipped.
 * Transactions already using the target tax type are skipped.
 * Transactions reconciled with a bank statement cannot be edited via the API
 * and will return an error — unreconcile them in Xero UI first.
 */
export async function fixGstForContact(
  contactId: string,
  newTaxType: string,
  fromDate?: string,
  toDate?: string,
): Promise<XeroClientResponse<GstFixSummary>> {
  try {
    await xeroClient.authenticate();

    const fetchResponse = await listAllBankTransactionsForContact(
      contactId,
      fromDate,
      toDate,
    );

    if (fetchResponse.isError) {
      throw new Error(
        `Failed to fetch bank transactions: ${fetchResponse.error}`,
      );
    }

    const transactions = fetchResponse.result;
    const results: GstFixResult[] = [];

    for (const transaction of transactions) {
      const id = transaction.bankTransactionID ?? "unknown";
      const statusValue = transaction.status?.toString() ?? "";

      if (
        statusValue === BankTransaction.StatusEnum.DELETED.toString() ||
        statusValue === BankTransaction.StatusEnum.VOIDED.toString()
      ) {
        results.push({
          bankTransactionId: id,
          date: transaction.date?.toString(),
          reference: transaction.reference,
          total: transaction.total,
          status: "skipped",
          message: `Skipped — status is ${statusValue}`,
        });
        continue;
      }

      const needsUpdate = transaction.lineItems?.some(
        (li) => li.taxType !== newTaxType,
      );

      if (!needsUpdate) {
        results.push({
          bankTransactionId: id,
          date: transaction.date?.toString(),
          reference: transaction.reference,
          total: transaction.total,
          status: "skipped",
          message: `Skipped — tax type is already ${newTaxType}`,
        });
        continue;
      }

      const updateResult = await updateTaxTypeOnTransaction(
        transaction,
        newTaxType,
      );

      results.push({
        bankTransactionId: id,
        date: transaction.date?.toString(),
        reference: transaction.reference,
        total: transaction.total,
        status: updateResult.status,
        message: updateResult.message,
      });

      await sleep(INTER_REQUEST_DELAY_MS);
    }

    const summary: GstFixSummary = {
      contactId,
      fromDate,
      toDate,
      newTaxType,
      results,
      updatedCount: results.filter((r) => r.status === "updated").length,
      skippedCount: results.filter((r) => r.status === "skipped").length,
      errorCount: results.filter((r) => r.status === "error").length,
    };

    return { result: summary, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
