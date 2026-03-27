import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroPrepayments } from "../../handlers/list-xero-prepayments.handler.js";
import { zodOptionalUuid } from "../../helpers/zod-fields.js";

const ListPrepaymentsTool = CreateXeroTool(
  "list-prepayments",
  `List prepayments (advance payments received before an invoice is raised) in Xero.
Optionally filter by contact. Returns up to 100 per page.`,
  {
    contactId: zodOptionalUuid("Filter by contact ID (UUID)"),
    page: z.number().default(1).describe("Page number, starting at 1"),
  },
  async ({ contactId, page }) => {
    const response = await listXeroPrepayments(contactId, page);

    if (response.isError) {
      return {
        content: [
          { type: "text" as const, text: `Error listing prepayments: ${response.error}` },
        ],
      };
    }

    const items = response.result;
    if (!items || items.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No prepayments found." }],
      };
    }

    return {
      content: [
        { type: "text" as const, text: `Found ${items.length} prepayment(s) (page ${page}):` },
        ...items.map((p) => ({
          type: "text" as const,
          text: [
            `Prepayment ID: ${p.prepaymentID}`,
            `Type: ${p.type}`,
            p.contact
              ? `Contact: ${p.contact.name} (${p.contact.contactID})`
              : null,
            `Date: ${p.date}`,
            `Status: ${p.status}`,
            `Total: ${p.total}`,
            `Remaining Credit: ${p.remainingCredit}`,
            p.currencyCode ? `Currency: ${p.currencyCode}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        })),
      ],
    };
  },
);

export default ListPrepaymentsTool;
