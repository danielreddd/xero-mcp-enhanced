import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroCurrencies } from "../../handlers/list-xero-currencies.handler.js";

const ListCurrenciesTool = CreateXeroTool(
  "list-currencies",
  `List all currencies configured in the Xero organisation.
Shows the currency code and description for each enabled currency.`,
  {},
  async () => {
    const response = await listXeroCurrencies();

    if (response.isError) {
      return {
        content: [
          { type: "text" as const, text: `Error listing currencies: ${response.error}` },
        ],
      };
    }

    const currencies = response.result;
    if (!currencies || currencies.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No currencies found." }],
      };
    }

    return {
      content: [
        { type: "text" as const, text: `Found ${currencies.length} currency/currencies:` },
        ...currencies.map((c) => ({
          type: "text" as const,
          text: `${c.code} — ${c.description}`,
        })),
      ],
    };
  },
);

export default ListCurrenciesTool;
