import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { BankTransaction, LineAmountTypes } from "xero-node";

interface BankTransactionLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  taxType: string;
}

type BankTransactionType = "RECEIVE" | "SPEND";
type LineAmountTypesInput = "EXCLUSIVE" | "INCLUSIVE" | "NOTAX";

async function getBankTransaction(bankTransactionId: string): Promise<BankTransaction | undefined> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getBankTransaction(
    xeroClient.tenantId,
    bankTransactionId,
    undefined,
    getClientHeaders(),
  );

  return response.body.bankTransactions?.[0];
}

export async function updateXeroBankTransaction(
  bankTransactionId: string,
  type?: BankTransactionType,
  contactId?: string,
  lineItems?: BankTransactionLineItem[],
  reference?: string,
  date?: string,
  lineAmountTypes?: LineAmountTypesInput,
): Promise<XeroClientResponse<BankTransaction>> {
  try {
    const existing = await getBankTransaction(bankTransactionId);

    if (!existing) {
      throw new Error(`Could not find bank transaction`);
    }

    // Minimal payload — only include fields the caller explicitly wants to change.
    // Note: Xero's API does not allow editing transactions that have been
    // reconciled with a bank statement. Those will return a clear error:
    // "This Bank Transaction cannot be edited as it has been reconciled
    // with a Bank Statement." Unreconcile them in the Xero UI first.
    const updatePayload = { bankTransactionID: bankTransactionId } as unknown as BankTransaction;
    if (type)            (updatePayload as any).type = BankTransaction.TypeEnum[type];
    if (contactId)       (updatePayload as any).contact = { contactID: contactId };
    if (lineItems)       (updatePayload as any).lineItems = lineItems;
    if (reference)       (updatePayload as any).reference = reference;
    if (date)            (updatePayload as any).date = date;
    if (lineAmountTypes) (updatePayload as any).lineAmountTypes =
      ({ EXCLUSIVE: LineAmountTypes.Exclusive, INCLUSIVE: LineAmountTypes.Inclusive, NOTAX: LineAmountTypes.NoTax } as const)[lineAmountTypes];

    const response = await xeroClient.accountingApi.updateBankTransaction(
      xeroClient.tenantId,
      bankTransactionId,
      { bankTransactions: [updatePayload] },
      undefined,
      undefined,
      getClientHeaders(),
    );

    const updated = response.body.bankTransactions?.[0];

    if (!updated) {
      throw new Error(`Failed to update bank transaction`);
    }

    return { result: updated, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
