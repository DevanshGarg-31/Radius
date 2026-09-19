import { ApiError } from "@/services/api";

/** Turns API failures into sentences a person can act on. */
export function humanError(error: unknown, fallback = "Something went wrong on our side."): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Some details don't look right. Check the highlighted fields and try again.";
    if (error.status === 401) return "Your session ended. Sign in again to continue.";
    if (error.status === 403) return "This belongs to someone else, so you can't change it.";
    if (error.status === 404) return "We couldn't find that. It may have been removed.";
    if (error.status === 409) return error.message;
    return fallback;
  }
  if (error instanceof TypeError) return "We couldn't reach radius. Check your connection and try again.";
  return fallback;
}
