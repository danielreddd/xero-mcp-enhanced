import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listAllBankTransactionsForContact } from "../../handlers/list-xero-bank-transactions.handler.js";
import { formatLineItem } from "../../helpers/format-line-item.js";
import { zodOptionalDate, zodUuid } from "../../helpers/zod-fields.js";

const ListBankTransactionsByContactTool = CreateXeroTool(
  "list-bank-transactions-by-contact",
  `Fetch ALL bank transactions for a specific contact, optionally within a date range.

Unlike list-bank-transactions (which is paginated), this tool automatically pages
through all results and returns them in a single response. Use this when you need a
complete picture of all transactions for a contact — for example, before running
fix-gst-for-contact or auditing a supplier/customer.`,
  {
    contactId: zodUuid("The Xero contact ID (UUID) to fetch transactions for"),
    fromDate: zodOptionalDate("Start of date range, inclusive (YYYY-MM-DD)"),
    toDate: zodOptionalDate("End of date range, inclusive (YYYY-MM-DD)"),
  },
  async ({ contactId, fromDate, toDate }) => {
    const response = await listAllBankTransactionsForContact(
      contactId,
      fromDate,
      toDate,
    );

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching bank transactions for contact: ${response.error}`,
          },
        ],
      };
    }

    const transactions = response.result;

    if (!transactions || transactions.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No bank transactions found for contact ${contactId}${fromDate || toDate ? ` in the specified date range` : ""}.`,
          },
        ],
      };
    }

    const total = transactions.reduce((sum, t) => sum + (t.total ?? 0), 0);

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Found ${transactions.length} bank transaction(s) for contact ${contactId}`,
            fromDate || toDate
              ? `Date range: ${fromDate ?? "any"} → ${toDate ?? "any"}`
              : null,
            `Total value: ${total.toFixed(2)}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        ...transactions.map((transaction) => ({
          type: "text" as const,
          text: [
            `---`,
            `Bank Transaction ID: ${transaction.bankTransactionID}`,
            `Bank Account: ${transaction.bankAccount?.name} (${transaction.bankAccount?.accountID})`,
            transaction.contact
              ? `Contact: ${transaction.contact.name} (${transaction.contact.contactID})`
              : null,
            transaction.date ? `Date: ${transaction.date}` : null,
            transaction.reference ? `Reference: ${transaction.reference}` : null,
            transaction.total !== undefined ? `Total: ${transaction.total}` : null,
            transaction.totalTax !== undefined
              ? `Total Tax: ${transaction.totalTax}`
              : null,
            transaction.isReconciled !== undefined
              ? transaction.isReconciled
                ? "Reconciled"
                : "Unreconciled"
              : null,
            `Status: ${transaction.status || "Unknown"}`,
            transaction.lineItems && transaction.lineItems.length > 0
              ? `Line Items:\n${transaction.lineItems.map(formatLineItem).join("\n---\n")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
        })),
      ],
    };
  },
);

export default ListBankTransactionsByContactTool;
