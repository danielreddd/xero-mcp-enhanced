import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { getXeroContact } from "../../handlers/get-xero-contact.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { zodUuid } from "../../helpers/zod-fields.js";

const GetContactTool = CreateXeroTool(
  "get-contact",
  `Get full details for a single Xero contact by their contact ID.

Returns comprehensive contact information including addresses, phone numbers,
tax registration numbers, payment terms, account balances, and tracking categories.
Provides a direct link to the contact in Xero.`,
  {
    contactId: zodUuid("The Xero contact ID (UUID)"),
  },
  async ({ contactId }) => {
    const response = await getXeroContact(contactId);

    if (response.isError) {
      return {
        content: [
          { type: "text" as const, text: `Error fetching contact: ${response.error}` },
        ],
      };
    }

    const c = response.result;

    let deepLink: string | null = null;
    try {
      deepLink = (await getDeepLink(DeepLinkType.CONTACT, contactId)) ?? null;
    } catch {
      // Non-fatal
    }

    const addressLines = c.addresses?.map((a) =>
      [
        `  ${a.addressType}:`,
        a.addressLine1 ? `    ${a.addressLine1}` : null,
        a.addressLine2 ? `    ${a.addressLine2}` : null,
        a.city ? `    ${a.city}` : null,
        a.region ? `    ${a.region}` : null,
        a.postalCode ? `    ${a.postalCode}` : null,
        a.country ? `    ${a.country}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    const phoneLines = c.phones?.map((p) =>
      `  ${p.phoneType}: ${p.phoneCountryCode ?? ""}${p.phoneAreaCode ?? ""}${p.phoneNumber ?? ""}`.trim(),
    );

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Contact ID: ${c.contactID}`,
            `Name: ${c.name}`,
            c.firstName || c.lastName
              ? `Person: ${[c.firstName, c.lastName].filter(Boolean).join(" ")}`
              : null,
            c.emailAddress ? `Email: ${c.emailAddress}` : null,
            `Status: ${c.contactStatus}`,
            c.isSupplier !== undefined ? `Is Supplier: ${c.isSupplier}` : null,
            c.isCustomer !== undefined ? `Is Customer: ${c.isCustomer}` : null,
            c.taxNumber ? `Tax Number: ${c.taxNumber}` : null,
            c.accountsReceivableTaxType
              ? `AR Tax Type: ${c.accountsReceivableTaxType}`
              : null,
            c.accountsPayableTaxType
              ? `AP Tax Type: ${c.accountsPayableTaxType}`
              : null,
            c.defaultCurrency ? `Default Currency: ${c.defaultCurrency}` : null,
            c.website ? `Website: ${c.website}` : null,
            addressLines && addressLines.length > 0
              ? `Addresses:\n${addressLines.join("\n")}`
              : null,
            phoneLines && phoneLines.length > 0
              ? `Phones:\n${phoneLines.join("\n")}`
              : null,
            c.balances?.accountsReceivable?.outstanding !== undefined
              ? `AR Outstanding: ${c.balances.accountsReceivable.outstanding}`
              : null,
            c.balances?.accountsPayable?.outstanding !== undefined
              ? `AP Outstanding: ${c.balances.accountsPayable.outstanding}`
              : null,
            deepLink ? `View in Xero: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default GetContactTool;
