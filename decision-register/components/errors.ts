import { ConvexError } from "convex/values";

/** Readable message from a failed Convex call. */
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) return String(err.data);
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
