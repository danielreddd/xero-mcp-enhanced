import { xeroClient } from "../clients/xero-client.js";
import { Contact } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function getContact(contactId: string): Promise<Contact | undefined> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getContact(
    xeroClient.tenantId,
    contactId,
    getClientHeaders(),
  );

  return response.body.contacts?.[0];
}

export async function getXeroContact(
  contactId: string,
): Promise<XeroClientResponse<Contact>> {
  try {
    const contact = await getContact(contactId);
    if (!contact) throw new Error(`Contact ${contactId} not found`);
    return { result: contact, isError: false, error: null };
  } catch (error) {
    return { result: null, isError: true, error: formatError(error) };
  }
}
