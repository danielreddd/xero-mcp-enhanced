import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroRepeatingInvoices } from "../../handlers/list-xero-repeating-invoices.handler.js";

const ListRepeatingInvoicesTool = CreateXeroTool(
  "list-repeating-invoices",
  `List all repeating (recurring) invoice templates set up in Xero.
Shows schedule, contact, amount, and status for each repeating invoice.
Useful for auditing recurring billing or understanding automated invoicing.`,
  {},
  async () => {
    const response = await listXeroRepeatingInvoices();

    if (response.isError) {
      return {
        content: [
          { type: "text" as const, text: `Error listing repeating invoices: ${response.error}` },
        ],
      };
    }

    const invoices = response.result;
    if (!invoices || invoices.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No repeating invoices found." }],
      };
    }

    return {
      content: [
        { type: "text" as const, text: `Found ${invoices.length} repeating invoice(s):` },
        ...invoices.map((inv) => ({
          type: "text" as const,
          text: [
            `Repeating Invoice ID: ${inv.repeatingInvoiceID}`,
            `Type: ${inv.type}`,
            `Contact: ${inv.contact?.name} (${inv.contact?.contactID})`,
            `Status: ${inv.status}`,
            inv.schedule
              ? [
                  `Schedule:`,
                  `  Unit: ${inv.schedule.unit}`,
                  `  Period: ${inv.schedule.period}`,
                  `  Start Date: ${inv.schedule.startDate}`,
                  inv.schedule.endDate
                    ? `  End Date: ${inv.schedule.endDate}`
                    : null,
                  `  Next Scheduled Date: ${inv.schedule.nextScheduledDate}`,
                ]
                  .filter(Boolean)
                  .join("\n")
              : null,
            `Total: ${inv.total}`,
            inv.currencyCode ? `Currency: ${inv.currencyCode}` : null,
            `Has Attachments: ${inv.hasAttachments}`,
          ]
            .filter(Boolean)
            .join("\n"),
        })),
      ],
    };
  },
);

export default ListRepeatingInvoicesTool;
