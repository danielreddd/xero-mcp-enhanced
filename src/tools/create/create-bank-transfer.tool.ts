import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { createXeroBankTransfer } from "../../handlers/create-xero-bank-transfer.handler.js";
import { zodOptionalDate, zodUuid } from "../../helpers/zod-fields.js";

const CreateBankTransferTool = CreateXeroTool(
  "create-bank-transfer",
  `Create a bank transfer between two Xero bank accounts.
Use list-accounts to find the account IDs first if needed.`,
  {
    fromBankAccountId: zodUuid("Account ID (UUID) of the source bank account"),
    toBankAccountId: zodUuid("Account ID (UUID) of the destination bank account"),
    amount: z
      .number()
      .positive()
      .describe("Amount to transfer (positive number)"),
    date: zodOptionalDate("Transfer date (YYYY-MM-DD). Defaults to today."),
  },
  async ({ fromBankAccountId, toBankAccountId, amount, date }) => {
    const response = await createXeroBankTransfer(
      fromBankAccountId,
      toBankAccountId,
      amount,
      date,
    );

    if (response.isError) {
      return {
        content: [{ type: "text" as const, text: `Error creating bank transfer: ${response.error}` }],
      };
    }

    const t = response.result;
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Bank transfer created successfully:`,
            `Transfer ID: ${t.bankTransferID}`,
            `Date: ${t.date}`,
            `From: ${t.fromBankAccount?.name} (${t.fromBankAccount?.accountID})`,
            `To:   ${t.toBankAccount?.name} (${t.toBankAccount?.accountID})`,
            `Amount: ${t.amount}`,
          ].join("\n"),
        },
      ],
    };
  },
);

export default CreateBankTransferTool;
