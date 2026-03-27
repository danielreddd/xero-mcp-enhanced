import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { fixGstForContact } from "../../handlers/fix-gst-for-contact.handler.js";
import { zodOptionalDate, zodUuid } from "../../helpers/zod-fields.js";

const FixGstForContactTool = CreateXeroTool(
  "fix-gst-for-contact",
  `Bulk-update the tax type on all bank transaction line items for a given contact,
optionally restricted to a date range.

For each matching transaction this tool will:
1. Check whether the line items already use the target tax type (skip if so)
2. If the transaction is reconciled, automatically unreconcile it first
3. Apply the new tax type to every line item
4. Re-reconcile the transaction if it was previously reconciled

Transactions with status DELETED or VOIDED are skipped automatically.

Common Australian tax types: OUTPUT2 (GST on Income), INPUT2 (GST on Expenses),
EXEMPTOUTPUT (BAS Excluded on Income), EXEMPTEXPENSES (BAS Excluded on Expenses),
NONE (No Tax).

IMPORTANT: This operation modifies reconciled transactions. Always review the
results and reconcile in Xero afterwards if needed. It is strongly recommended to
run list-bank-transactions-by-contact first to preview the affected transactions.`,
  {
    contactId: zodUuid("The Xero contact ID (UUID) whose transactions should be updated"),
    newTaxType: z
      .string()
      .min(1)
      .max(50)
      .describe(
        "The tax type code to apply to all line items (e.g. OUTPUT2, INPUT2, NONE, EXEMPTEXPENSES)",
      ),
    fromDate: zodOptionalDate("Start of date range, inclusive (YYYY-MM-DD)"),
    toDate: zodOptionalDate("End of date range, inclusive (YYYY-MM-DD)"),
  },
  async ({ contactId, newTaxType, fromDate, toDate }) => {
    const response = await fixGstForContact(
      contactId,
      newTaxType,
      fromDate,
      toDate,
    );

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error running fix-gst-for-contact: ${response.error}`,
          },
        ],
      };
    }

    const summary = response.result;

    const lines = [
      `GST fix complete for contact ${summary.contactId}`,
      `Tax type applied: ${summary.newTaxType}`,
      summary.fromDate || summary.toDate
        ? `Date range: ${summary.fromDate ?? "any"} → ${summary.toDate ?? "any"}`
        : null,
      ``,
      `Results:`,
      `  ✓ Updated:  ${summary.updatedCount}`,
      `  → Skipped:  ${summary.skippedCount}`,
      `  ✗ Errors:   ${summary.errorCount}`,
    ];

    if (summary.errorCount > 0) {
      lines.push(``, `Errors:`);
      for (const r of summary.results.filter((r) => r.status === "error")) {
        lines.push(
          `  • ${r.bankTransactionId} (${r.date ?? "no date"}, ${r.total ?? 0}): ${r.message}`,
        );
      }
    }

    if (summary.updatedCount > 0) {
      lines.push(``, `Updated transactions:`);
      for (const r of summary.results.filter((r) => r.status === "updated")) {
        lines.push(
          `  • ${r.bankTransactionId} | ${r.date ?? "no date"} | ${r.reference ?? "(no ref)"} | ${r.total ?? 0} | ${r.message}`,
        );
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: lines.filter((l) => l !== null).join("\n"),
        },
      ],
    };
  },
);

export default FixGstForContactTool;
