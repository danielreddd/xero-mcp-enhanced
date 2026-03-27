import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { updateXeroBankTransaction } from "../../handlers/update-xero-bank-transaction.handler.js";
import { bankTransactionDeepLink } from "../../consts/deeplinks.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const UpdateBankTransactionTool = CreateXeroTool(
  "update-bank-transaction",
  `Update a bank transaction in Xero.
  Reconciled transactions are handled automatically: the transaction is
  unreconciled, updated, then re-reconciled. If the update fails the
  transaction is left unreconciled so the user can investigate.
  When a bank transaction is updated, a deep link to the bank transaction in Xero is returned.
  This deep link can be used to view the bank transaction in Xero directly.
  This link should be displayed to the user.`,
  {
    bankTransactionId: z.string(),
    type: z.enum(["RECEIVE", "SPEND"]).optional(),
    contactId: z.string().optional(),
    lineItems: z.array(lineItemSchema).optional().describe(
      "All line items must be provided. Any line items not provided will be removed. Including existing line items. \
      Do not modify line items that have not been specified by the user",
    ),
    reference: z.string().optional(),
    date: z.string().optional(),
    lineAmountTypes: z.enum(["EXCLUSIVE", "INCLUSIVE", "NOTAX"]).optional().describe(
      "How tax is applied to amounts on line items. " +
      "EXCLUSIVE = amounts exclude GST/tax (tax is added on top). " +
      "INCLUSIVE = amounts include GST/tax. " +
      "NOTAX = no tax applied.",
    ),
  },
  async ({
    bankTransactionId,
    type,
    contactId,
    lineItems,
    reference,
    date,
    lineAmountTypes,
  }) => {
    const result = await updateXeroBankTransaction(
      bankTransactionId,
      type,
      contactId,
      lineItems,
      reference,
      date,
      lineAmountTypes,
    );

    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating bank transaction: ${result.error}`,
          },
        ],
      };
    }

    const bankTransaction = result.result;

    const deepLink =
      bankTransaction.bankAccount?.accountID && bankTransaction.bankTransactionID
        ? bankTransactionDeepLink(
            bankTransaction.bankAccount.accountID,
            bankTransaction.bankTransactionID,
          )
        : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Bank transaction updated successfully:",
            `ID: ${bankTransaction?.bankTransactionID}`,
            `Date: ${bankTransaction?.date}`,
            `Contact: ${bankTransaction?.contact?.name}`,
            `Total: ${bankTransaction?.total}`,
            `Status: ${bankTransaction?.status}`,
            `Line amount types: ${bankTransaction?.lineAmountTypes}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default UpdateBankTransactionTool;
