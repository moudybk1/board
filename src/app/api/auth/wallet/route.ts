import { NextResponse } from "next/server";

import { sessionCookieHeader } from "@/server/lib/request-session";
import { AuthError } from "@/server/services/auth.service";
import { loginWithWallet } from "@/server/services/wallet-auth.service";

/**
 * POST /api/auth/wallet · wallet-only sign-in (create or resume account).
 *
 * Body: `{ address: string, signature: string, message: string }`
 * Sets the `board_session` cookie on success.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  if (
    typeof raw.address !== "string" ||
    typeof raw.signature !== "string" ||
    typeof raw.message !== "string"
  ) {
    return NextResponse.json(
      { error: "address, signature, and message are required." },
      { status: 400 },
    );
  }

  try {
    const result = await loginWithWallet({
      address: raw.address,
      signature: raw.signature,
      message: raw.message,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        undefined,
    });

    const response = NextResponse.json(result);
    response.headers.set(
      "Set-Cookie",
      sessionCookieHeader(
        result.session.token,
        new Date(result.session.expiresAt),
      ),
    );
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/auth/wallet]", error);
    return NextResponse.json(
      { error: "Failed to sign in with wallet." },
      { status: 500 },
    );
  }
}
