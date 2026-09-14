import { NextResponse } from "next/server";

import { sessionCookieHeader } from "@/server/lib/request-session";
import { AuthError, registerUser } from "@/server/services/auth.service";

/**
 * POST /api/auth/register · create account + session cookie/token.
 *
 * Body: `{ email, username, password }`
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
  if (
    typeof raw.email !== "string" ||
    typeof raw.username !== "string" ||
    typeof raw.password !== "string"
  ) {
    return NextResponse.json(
      { error: "email, username, and password are required." },
      { status: 400 },
    );
  }

  try {
    const result = await registerUser({
      email: raw.email,
      username: raw.username,
      password: raw.password,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        undefined,
    });

    const response = NextResponse.json(result, { status: 201 });
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
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Failed to register." },
      { status: 500 },
    );
  }
}
