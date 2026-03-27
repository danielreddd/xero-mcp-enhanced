import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroBankTransfers } from "../../handlers/list-xero-bank-transfers.handler.js";
import { zodOptionalDate } from "../../helpers/zod-fields.js";

const ListBankTransfersTool = CreateXeroTool(
  "list-bank-transfers",
  `List bank transfers between accounts in Xero.
Optionally filter by a date range. Returns all matching transfers sorted by date descending.`,
  {
    fromDate: zodOptionalDate("Start of date range, inclusive (YYYY-MM-DD)"),
    toDate: zodOptionalDate("End of date range, inclusive (YYYY-MM-DD)"),
  },
  async ({ fromDate, toDate }) => {
    const response = await listXeroBankTransfers(fromDate, toDate);

    if (response.isError) {
      return {
        content: [{ type: "text" as const, text: `Error listing bank transfers: ${response.error}` }],
      };
    }

    const transfers = response.result;
    if (!transfers || transfers.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No bank transfers found." }],
      };
    }

    return {
      content: [
        { type: "text" as const, text: `Found ${transfers.length} bank transfer(s):` },
        ...transfers.map((t) => ({
          type: "text" as const,
          text: [
            `Transfer ID: ${t.bankTransferID}`,
            `Date: ${t.date}`,
            `From: ${t.fromBankAccount?.name} (${t.fromBankAccount?.accountID})`,
            `To: ${t.toBankAccount?.name} (${t.toBankAccount?.accountID})`,
            `Amount: ${t.amount}`,
            t.currencyRate ? `Currency Rate: ${t.currencyRate}` : null,
            t.reference ? `Reference: ${t.reference}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        })),
      ],
    };
  },
);

export default ListBankTransfersTool;
