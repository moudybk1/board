import { readSessionToken } from "@/server/lib/request-session";
import { defineServiceError } from "@/server/lib/service-error";
import { resolveSessionToken } from "@/server/services/auth.service";

/** Thrown when a request carries no usable session. Routes map it to 401. */
export const UnauthenticatedError = defineServiceError("UnauthenticatedError");

export type RequestUser = {
  userId: string;
  username: string;
};

/**
 * The acting user for a request, or a 401.
 *
 * This replaces an earlier resolver that fell back to an `x-user-id` header
 * and then to the mock player when no session resolved, which let any
 * anonymous caller act as any user on every money and game route.
 */
export async function requireUser(request: Request): Promise<RequestUser> {
  const session = await resolveSessionToken(readSessionToken(request));
  if (!session) {
    throw new UnauthenticatedError("Sign in to continue.", 401);
  }

  return { userId: session.user.id, username: session.user.username };
}

/**
 * The acting user, or null when the request is anonymous. For endpoints that
 * serve both signed-in and signed-out callers.
 */
export async function optionalUser(
  request: Request,
): Promise<RequestUser | null> {
  const session = await resolveSessionToken(readSessionToken(request));
  if (!session) return null;
  return { userId: session.user.id, username: session.user.username };
}
