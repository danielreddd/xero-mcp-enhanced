import { xeroClient } from "../clients/xero-client.js";
import { BankTransfer } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function createBankTransfer(
  fromBankAccountId: string,
  toBankAccountId: string,
  amount: number,
  date?: string,
): Promise<BankTransfer> {
  await xeroClient.authenticate();

  const transfer: BankTransfer = {
    fromBankAccount: { accountID: fromBankAccountId },
    toBankAccount: { accountID: toBankAccountId },
    amount,
    date: date ?? new Date().toISOString().split("T")[0],
  };

  const response = await xeroClient.accountingApi.createBankTransfer(
    xeroClient.tenantId,
    { bankTransfers: [transfer] },
    undefined, // idempotencyKey
    getClientHeaders(),
  );

  const created = response.body.bankTransfers?.[0];
  if (!created) throw new Error("Bank transfer creation returned no result");
  return created;
}

export async function createXeroBankTransfer(
  fromBankAccountId: string,
  toBankAccountId: string,
  amount: number,
  date?: string,
): Promise<XeroClientResponse<BankTransfer>> {
  try {
    const transfer = await createBankTransfer(
      fromBankAccountId,
      toBankAccountId,
      amount,
      date,
    );
    return { result: transfer, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
