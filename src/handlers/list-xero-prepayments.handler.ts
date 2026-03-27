import { xeroClient } from "../clients/xero-client.js";
import { Prepayment } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { assertUuid } from "../helpers/validate-inputs.js";

async function getPrepayments(
  contactId?: string,
  page: number = 1,
): Promise<Prepayment[]> {
  await xeroClient.authenticate();

  if (contactId) assertUuid(contactId, "contactId");

  const where = contactId
    ? `Contact.ContactID=Guid("${contactId}")`
    : undefined;

  const response = await xeroClient.accountingApi.getPrepayments(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    where,
    "Date DESC",
    page,
    undefined, // unitdp
    100,
    getClientHeaders(),
  );

  return response.body.prepayments ?? [];
}

export async function listXeroPrepayments(
  contactId?: string,
  page: number = 1,
): Promise<XeroClientResponse<Prepayment[]>> {
  try {
    const prepayments = await getPrepayments(contactId, page);
    return { result: prepayments, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
