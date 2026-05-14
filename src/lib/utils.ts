import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Extract a user-friendly error message from an API error response
 * Handles various error formats from the backend API
 */
export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = "An unexpected error occurred",
): string {
  // Handle Error objects
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  // Handle string errors
  if (typeof error === "string") {
    try {
      // Try to parse as JSON in case it's a stringified error object
      const parsed = JSON.parse(error);
      if (parsed.error) {
        // Handle Zod validation errors
        if (parsed.error.issues && Array.isArray(parsed.error.issues)) {
          return parsed.error.issues
            .map((issue: any) => issue.message)
            .join(", ");
        }
        // Handle simple error messages
        if (typeof parsed.error === "string") {
          return parsed.error;
        }
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // If not JSON, return the string as-is if it's not too long
      return error.length > 200 ? fallbackMessage : error;
    }
  }

  // Handle objects with error properties
  if (error && typeof error === "object") {
    const err = error as any;

    // Check for Zod validation errors
    if (err.error?.issues && Array.isArray(err.error.issues)) {
      return err.error.issues.map((issue: any) => issue.message).join(", ");
    }

    // Check for common error message properties
    if (err.message) return err.message;
    if (err.error)
      return typeof err.error === "string" ? err.error : fallbackMessage;
    if (err.statusText) return err.statusText;
  }

  return fallbackMessage;
}
