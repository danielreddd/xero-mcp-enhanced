import { xeroClient } from "../clients/xero-client.js";
import { Overpayment } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { assertUuid } from "../helpers/validate-inputs.js";

async function getOverpayments(
  contactId?: string,
  page: number = 1,
): Promise<Overpayment[]> {
  await xeroClient.authenticate();

  if (contactId) assertUuid(contactId, "contactId");

  const where = contactId
    ? `Contact.ContactID=Guid("${contactId}")`
    : undefined;

  const response = await xeroClient.accountingApi.getOverpayments(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    where,
    "Date DESC",
    page,
    undefined, // unitdp
    100,
    undefined, // references
    getClientHeaders(),
  );

  return response.body.overpayments ?? [];
}

export async function listXeroOverpayments(
  contactId?: string,
  page: number = 1,
): Promise<XeroClientResponse<Overpayment[]>> {
  try {
    const overpayments = await getOverpayments(contactId, page);
    return { result: overpayments, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
