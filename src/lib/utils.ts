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

export function formatFullDateTime(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(diffInSeconds, "second");
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, "hour");
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) {
    return rtf.format(diffInDays, "day");
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (Math.abs(diffInMonths) < 12) {
    return rtf.format(diffInMonths, "month");
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return rtf.format(diffInYears, "year");
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
