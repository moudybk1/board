import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { readSessionToken } from "@/server/lib/request-session";
import { resolveSessionToken } from "@/server/services/auth.service";

/**
 * Resolve the acting user from session token, else fall back to x-user-id stub.
 */
export async function resolveRequestUser(request: Request): Promise<{
  userId: string;
  via: "session" | "header";
}> {
  const token = readSessionToken(request);
  const session = await resolveSessionToken(token);
  if (session) {
    return { userId: session.user.id, via: "session" };
  }

  const header = request.headers.get("x-user-id")?.trim();
  return { userId: header || MOCK_PLAYER.id, via: "header" };
}
