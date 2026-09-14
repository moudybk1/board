import { NextResponse } from "next/server";

import { sessionCookieHeader } from "@/server/lib/request-session";
import { AuthError, loginUser } from "@/server/services/auth.service";

/**
 * POST /api/auth/login · email/password sign-in + session cookie/token.
 *
 * Body: `{ email, password }`
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  if (typeof raw.email !== "string" || typeof raw.password !== "string") {
    return NextResponse.json(
      { error: "email and password are required." },
      { status: 400 },
    );
  }

  try {
    const result = await loginUser({
      email: raw.email,
      password: raw.password,
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
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json({ error: "Failed to sign in." }, { status: 500 });
  }
}
