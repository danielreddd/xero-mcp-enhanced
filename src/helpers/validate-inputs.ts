/**
 * Input validation helpers for values that get interpolated into Xero API
 * WHERE clauses. Without these checks, malicious inputs could inject arbitrary
 * OData filter syntax (e.g. closing the Guid() wrapper early and appending
 * additional conditions).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns true if the string is a valid RFC-4122 UUID.
 */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Returns true if the string is a valid YYYY-MM-DD calendar date.
 * Also checks that month is 1–12 and day is 1–31 (coarse range check).
 */
export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [, mm, dd] = value.split("-").map(Number);
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
}

/**
 * Asserts that a value is a valid UUID; throws with a clear message if not.
 * Use this inside handler functions before building WHERE clauses.
 */
export function assertUuid(value: string, fieldName: string): void {
  if (!isValidUuid(value)) {
    throw new Error(
      `Invalid ${fieldName}: "${value}" is not a valid UUID. ` +
        `Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
    );
  }
}

/**
 * Asserts that a value is a valid YYYY-MM-DD date string.
 */
export function assertDate(value: string, fieldName: string): void {
  if (!isValidDate(value)) {
    throw new Error(
      `Invalid ${fieldName}: "${value}" is not a valid date. ` +
        `Expected format: YYYY-MM-DD`,
    );
  }
}
