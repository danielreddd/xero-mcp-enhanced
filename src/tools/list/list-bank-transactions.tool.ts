import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroBankTransactions } from "../../handlers/list-xero-bank-transactions.handler.js";
import { formatLineItem } from "../../helpers/format-line-item.js";
import { zodOptionalDate, zodOptionalUuid } from "../../helpers/zod-fields.js";

const ListBankTransactionsTool = CreateXeroTool(
  "list-bank-transactions",
  `List bank transactions in Xero with optional filters.

Supports filtering by:
- bankAccountId: only show transactions for a specific bank account
- contactId: only show transactions involving a specific contact
- fromDate / toDate: date range filter (YYYY-MM-DD format)

Returns up to 100 transactions per page. If exactly 100 are returned, offer the
user to fetch the next page. All filters can be combined freely.`,
  {
    page: z.number().default(1).describe("Page number, starting at 1"),
    bankAccountId: zodOptionalUuid("Filter by bank account ID (UUID)"),
    contactId: zodOptionalUuid("Filter by contact ID (UUID)"),
    fromDate: zodOptionalDate("Start of date range, inclusive (YYYY-MM-DD)"),
    toDate: zodOptionalDate("End of date range, inclusive (YYYY-MM-DD)"),
  },
  async ({ bankAccountId, contactId, fromDate, toDate, page }) => {
    const response = await listXeroBankTransactions(page, {
      bankAccountId,
      contactId,
      fromDate,
      toDate,
    });

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing bank transactions: ${response.error}`,
          },
        ],
      };
    }

    const bankTransactions = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${bankTransactions?.length || 0} bank transactions (page ${page}):`,
        },
        ...(bankTransactions?.map((transaction) => ({
          type: "text" as const,
          text: [
            `Bank Transaction ID: ${transaction.bankTransactionID}`,
            `Bank Account: ${transaction.bankAccount.name} (${transaction.bankAccount.accountID})`,
            transaction.contact
              ? `Contact: ${transaction.contact.name} (${transaction.contact.contactID})`
              : null,
            transaction.reference
              ? `Reference: ${transaction.reference}`
              : null,
            transaction.date ? `Date: ${transaction.date}` : null,
            transaction.subTotal ? `Sub Total: ${transaction.subTotal}` : null,
            transaction.totalTax ? `Total Tax: ${transaction.totalTax}` : null,
            transaction.total ? `Total: ${transaction.total}` : null,
            transaction.isReconciled !== undefined
              ? transaction.isReconciled
                ? "Reconciled"
                : "Unreconciled"
              : null,
            transaction.currencyCode
              ? `Currency Code: ${transaction.currencyCode}`
              : null,
            `Status: ${transaction.status || "Unknown"}`,
            transaction.lineAmountTypes
              ? `Line Amount Types: ${transaction.lineAmountTypes}`
              : null,
            transaction.hasAttachments !== undefined
              ? transaction.hasAttachments
                ? "Has attachments"
                : "Does not have attachments"
              : null,
            `Line Items:\n${transaction.lineItems?.map(formatLineItem).join("\n---\n")}`,
          ]
            .filter(Boolean)
            .join("\n"),
        })) || []),
      ],
    };
  },
);

export default ListBankTransactionsTool;
