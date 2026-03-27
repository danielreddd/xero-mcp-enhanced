# xero-mcp-enhanced

An enhanced [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for Xero, forked and significantly improved from the [official Xero MCP server](https://github.com/XeroAPI/xero-mcp-server).

Point Claude Desktop (or any MCP-compatible client) at this server to interact with your Xero organisation using natural language.

---

## What's improved over the official server

| Area | Change |
|------|--------|
| **Auth scopes** | Scopes are now configurable via `XERO_SCOPES`. The hardcoded scopes in the original broke apps created after 2 March 2026 when Xero introduced granular scope requirements. |
| **Token refresh** | Custom-connection tokens are now cached and only refreshed when they're within 60 seconds of expiry — instead of making an extra HTTP round-trip on every single API call. |
| **Bearer token warnings** | If `XERO_CLIENT_BEARER_TOKEN` is expired (or about to expire), a clear warning is logged rather than a cryptic 401. |
| **Error messages** | Xero validation errors, `Elements[].ValidationErrors`, and nested objects are now properly formatted instead of returning `[object Object]`. |
| **Bank transactions** | `list-bank-transactions` now accepts `contactId`, `fromDate`, and `toDate` filters; page size increased to 100. `update-bank-transaction` now accepts `lineAmountTypes` (EXCLUSIVE / INCLUSIVE / NOTAX). |
| **New tools** | See table below. |

---

## New tools

| Tool | Description |
|------|-------------|
| `list-bank-transactions-by-contact` | Fetch **all** transactions for a contact across a date range in one call (auto-paginating). |
| `fix-gst-for-contact` | Bulk-update tax type on all bank transaction line items for a contact in a date range. Skips DELETED/VOIDED transactions and those already on the target tax type. Note: transactions reconciled with a bank statement cannot be edited via the Xero API — unreconcile them in the Xero UI first. |
| `list-bank-transfers` | List transfers between bank accounts, with optional date range filter. |
| `create-bank-transfer` | Transfer funds between two Xero bank accounts. |
| `list-repeating-invoices` | List all recurring invoice templates (schedule, contact, amount, status). |
| `list-currencies` | List currencies enabled in the organisation. |
| `get-contact` | Get full contact details by ID (addresses, phones, balances, tax settings, deep link). |
| `list-prepayments` | List prepayments (advance payments), optionally filtered by contact. |
| `list-overpayments` | List overpayments (excess payments), optionally filtered by contact. |

---

## Prerequisites

- Node.js 18+
- A Xero account with either:
  - A **Custom Connection** app (recommended for persistent use), or
  - A **manual Bearer token** (expires after 30 minutes — useful for testing)

### Setting up a Custom Connection app

1. Go to [developer.xero.com/app/manage](https://developer.xero.com/app/manage) and create a new app
2. Select **Custom Connection** as the integration type
3. Under **Scopes**, select the scopes you need (see defaults below)
4. Copy the **Client ID** and **Client Secret**

---

## Installation

### Option A — run directly with npx (recommended for Claude Desktop)

```json
{
  "mcpServers": {
    "xero": {
      "command": "npx",
      "args": ["-y", "github:danielreddd/xero-mcp-enhanced"],
      "env": {
        "XERO_CLIENT_ID": "your_client_id",
        "XERO_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

### Option B — clone and build locally

```bash
git clone https://github.com/danielreddd/xero-mcp-enhanced.git
cd xero-mcp-enhanced
npm install
npm run build
```

Then in your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "xero": {
      "command": "node",
      "args": ["/absolute/path/to/xero-mcp-enhanced/dist/index.js"],
      "env": {
        "XERO_CLIENT_ID": "your_client_id",
        "XERO_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

---

## Configuration

Copy `.env.example` to `.env` and fill in your credentials, **or** pass environment variables directly in your MCP client config as shown above.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `XERO_CLIENT_ID` | Yes (unless using bearer token) | Client ID from your Xero app |
| `XERO_CLIENT_SECRET` | Yes (unless using bearer token) | Client secret from your Xero app |
| `XERO_CLIENT_BEARER_TOKEN` | Alternative to client ID/secret | Manual bearer token (expires in 30 min) |
| `XERO_SCOPES` | No | Space-separated OAuth scopes. See defaults below. |

### Default scopes

```
openid profile email accounting.transactions accounting.contacts accounting.settings accounting.reports.read accounting.attachments payroll.settings payroll.employees payroll.timesheets
```

For apps created **before 2 March 2026** using the old broad scopes, you can override this to the shorter set:

```
accounting.transactions accounting.contacts accounting.settings accounting.reports.read payroll.settings payroll.employees payroll.timesheets
```

---

## Complete tool list

### List tools
- `list-accounts` — chart of accounts
- `list-bank-transactions` — with bankAccountId, contactId, fromDate, toDate filters
- `list-bank-transactions-by-contact` — all transactions for a contact (auto-paginated)
- `list-bank-transfers` — transfers between accounts
- `list-contacts` — search by name
- `list-contact-groups`
- `list-credit-notes`
- `list-currencies`
- `list-invoices` — filter by contact or invoice number
- `list-items` — products/services
- `list-manual-journals`
- `list-organisation-details`
- `list-overpayments` — filter by contact
- `list-payments` — filter by invoice, reference
- `list-prepayments` — filter by contact
- `list-profit-and-loss`
- `list-quotes`
- `list-repeating-invoices`
- `list-report-balance-sheet`
- `list-tax-rates`
- `list-tracking-categories`
- `list-trial-balance`
- `list-aged-receivables-by-contact`
- `list-aged-payables-by-contact`
- Payroll: `list-payroll-employees`, `list-payroll-timesheets`, `list-payroll-employee-leave`, `list-payroll-leave-types`, `list-payroll-leave-periods`, `list-payroll-employee-leave-types`, `list-payroll-employee-leave-balances`

### Get tools
- `get-contact` — full contact details including addresses, phones, balances
- `get-payroll-timesheet`

### Create tools
- `create-bank-transaction`
- `create-bank-transfer`
- `create-contact`
- `create-credit-note`
- `create-invoice`
- `create-item`
- `create-manual-journal`
- `create-payment`
- `create-quote`
- `create-payroll-timesheet`
- `create-tracking-category` / `create-tracking-options`

### Update tools
- `update-bank-transaction`
- `fix-gst-for-contact` — bulk tax-type fix on bank transactions
- `update-contact`
- `update-credit-note`
- `update-invoice`
- `update-item`
- `update-manual-journal`
- `update-quote`
- `update-tracking-category` / `update-tracking-options`
- Payroll: `approve-payroll-timesheet`, `revert-payroll-timesheet`, `update-payroll-timesheet-add-line`, `update-payroll-timesheet-update-line`

### Delete tools
- `delete-payroll-timesheet`

---

## Using fix-gst-for-contact

This tool is designed for accountants who need to bulk-correct the tax type on bank transactions — for example, if a supplier was set up without GST and all their transactions need to be updated to INPUT2.

**Recommended workflow:**

1. Find the contact ID: use `list-contacts` and search by name
2. Preview transactions: use `list-bank-transactions-by-contact` with your date range
3. Check the tax rates: use `list-tax-rates` to confirm the correct tax type code
4. Run the fix: `fix-gst-for-contact` with the contactId, newTaxType, fromDate, toDate

**Common Australian tax type codes:**

| Code | Description |
|------|-------------|
| `OUTPUT2` | GST on Income (15%) |
| `INPUT2` | GST on Expenses (15%) |
| `EXEMPTOUTPUT` | BAS Excluded on Sales |
| `EXEMPTEXPENSES` | BAS Excluded on Purchases |
| `NONE` | No Tax |
| `ZERORATEDINPUT` | Zero Rated Expenses |

> **Note:** This modifies reconciled transactions. Review the results and verify your bank reconciliation afterwards.

---

## Security

- Credentials are read from environment variables — never hardcoded
- No credentials are logged or transmitted to any service other than Xero's own APIs
- Tokens are cached in-memory only and discarded when the process exits

---

## License

MIT — see [LICENSE](./LICENSE)
