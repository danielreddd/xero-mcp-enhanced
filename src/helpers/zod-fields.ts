/**
 * Reusable Zod field definitions with built-in validation for fields that are
 * interpolated into Xero API WHERE clauses or used in API calls.
 *
 * Using these instead of plain z.string() prevents injection of arbitrary
 * OData filter syntax via malformed UUIDs or date strings.
 */
import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const zodUuid = (description: string) =>
  z
    .string()
    .regex(UUID_RE, "Must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)")
    .describe(description);

export const zodOptionalUuid = (description: string) =>
  z
    .string()
    .regex(UUID_RE, "Must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)")
    .optional()
    .describe(description);

export const zodOptionalDate = (description: string) =>
  z
    .string()
    .regex(DATE_RE, "Must be a valid date in YYYY-MM-DD format")
    .optional()
    .describe(description);

export const zodRequiredDate = (description: string) =>
  z
    .string()
    .regex(DATE_RE, "Must be a valid date in YYYY-MM-DD format")
    .describe(description);
