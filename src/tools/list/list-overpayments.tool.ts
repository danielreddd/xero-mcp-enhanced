import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroOverpayments } from "../../handlers/list-xero-overpayments.handler.js";
import { zodOptionalUuid } from "../../helpers/zod-fields.js";

const ListOverpaymentsTool = CreateXeroTool(
  "list-overpayments",
  `List overpayments (payments that exceed the invoice amount) in Xero.
Optionally filter by contact. Returns up to 100 per page.
Useful for identifying credit balances that can be applied to future invoices.`,
  {
    contactId: zodOptionalUuid("Filter by contact ID (UUID)"),
    page: z.number().default(1).describe("Page number, starting at 1"),
  },
  async ({ contactId, page }) => {
    const response = await listXeroOverpayments(contactId, page);

    if (response.isError) {
      return {
        content: [
          { type: "text" as const, text: `Error listing overpayments: ${response.error}` },
        ],
      };
    }

    const items = response.result;
    if (!items || items.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No overpayments found." }],
      };
    }

    return {
      content: [
        { type: "text" as const, text: `Found ${items.length} overpayment(s) (page ${page}):` },
        ...items.map((o) => ({
          type: "text" as const,
          text: [
            `Overpayment ID: ${o.overpaymentID}`,
            `Type: ${o.type}`,
            o.contact
              ? `Contact: ${o.contact.name} (${o.contact.contactID})`
              : null,
            `Date: ${o.date}`,
            `Status: ${o.status}`,
            `Total: ${o.total}`,
            `Remaining Credit: ${o.remainingCredit}`,
            o.currencyCode ? `Currency: ${o.currencyCode}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        })),
      ],
    };
  },
);

export default ListOverpaymentsTool;
