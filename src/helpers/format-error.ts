import { AxiosError } from "axios";

/**
 * Safely convert an unknown value to a readable string.
 * Prevents the common "[object Object]" problem.
 */
function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Extract the most useful error detail from a Xero AxiosError response body.
 * Xero returns errors in a variety of shapes:
 *   { Detail: "...", Message: "...", Elements: [...] }
 *   { message: "..." }
 *   plain string
 */
function extractXeroDetail(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;

  const parts: string[] = [];

  if (typeof d["Detail"] === "string") parts.push(d["Detail"]);
  if (typeof d["Message"] === "string" && d["Message"] !== d["Detail"])
    parts.push(d["Message"]);
  if (typeof d["message"] === "string") parts.push(d["message"]);

  // Validation errors are often nested inside Elements[].ValidationErrors
  if (Array.isArray(d["Elements"])) {
    for (const el of d["Elements"] as unknown[]) {
      if (el && typeof el === "object") {
        const element = el as Record<string, unknown>;
        if (Array.isArray(element["ValidationErrors"])) {
          for (const ve of element["ValidationErrors"] as unknown[]) {
            if (ve && typeof ve === "object") {
              const msg = (ve as Record<string, unknown>)["Message"];
              if (typeof msg === "string") parts.push(msg);
            }
          }
        }
      }
    }
  }

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

/**
 * Format error messages in a user-friendly way.
 */
export function formatError(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data;
    const detail = extractXeroDetail(data) ?? stringify(data);

    switch (status) {
      case 400:
        return `Bad request: ${detail || "Check the request parameters."}`;
      case 401:
        return "Authentication failed. Please check your Xero credentials.";
      case 403:
        return "You don't have permission to access this resource in Xero.";
      case 404:
        return `Not found: ${detail || "The requested resource was not found in Xero."}`;
      case 409:
        return `Conflict: ${detail || "The resource already exists or there is a duplicate."}`;
      case 429:
        return "Rate limit exceeded — please try again in a moment.";
      case 500:
        return `Xero internal server error: ${detail || "Try again later."}`;
      default:
        return detail
          ? `Xero API error (HTTP ${status ?? "unknown"}): ${detail}`
          : `An error occurred while communicating with Xero (HTTP ${status ?? "unknown"}).`;
    }
  }
  return error instanceof Error
    ? error.message
    : `An unexpected error occurred: ${stringify(error)}`;
}
