import { NextResponse } from "next/server";

import {
  defineServiceError,
  ServiceError,
  statusForCode,
} from "@/server/lib/service-error";

/**
 * Map a thrown error to a response.
 *
 * Domain code throws `ServiceError` subclasses carrying their own status, so
 * handlers stay thin: they parse input, call one service, and hand anything
 * thrown to this function. Unknown errors are logged and become a 500 so
 * internal messages never reach the client.
 */
export function errorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error(`[${context}]`, error);
  return NextResponse.json(
    { error: "Something went wrong. Try again." },
    { status: 500 },
  );
}

/**
 * Map a failed domain result (the `{ ok: false, code, message }` shape the
 * room and game services return) to a response.
 */
export function failureResponse(
  result: { code: string; message: string } & Record<string, unknown>,
  overrides: Record<string, number> = {},
): NextResponse {
  const { code, message, ...rest } = result;
  return NextResponse.json(
    { error: message, code, ...rest },
    { status: statusForCode(code, overrides) },
  );
}

/** Read and parse a JSON body, answering 400 rather than throwing on garbage. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Thrown when a request body carries a field of the wrong shape. */
export const InvalidBodyError = defineServiceError("InvalidBodyError");

/**
 * Read an optional integer field from an unvalidated body.
 *
 * Returns undefined when the field is absent, and throws a 400 when it is
 * present but not an integer inside `[min, max]`. Validating here keeps the
 * service from having to re-check what the transport already received.
 */
export function readOptionalInteger(
  body: unknown,
  key: string,
  range: { min: number; max: number },
): number | undefined {
  if (typeof body !== "object" || body === null) return undefined;

  const raw = (body as Record<string, unknown>)[key];
  if (raw === undefined || raw === null) return undefined;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < range.min || value > range.max) {
    throw new InvalidBodyError(
      `${key} must be an integer ${range.min}-${range.max}.`,
      400,
    );
  }

  return value;
}

/**
 * Read a required numeric field. Throws a 400 when it is missing or not a
 * finite number, so services receive a number rather than re-checking NaN.
 */
export function readNumber(body: unknown, key: string): number {
  const raw =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)[key]
      : undefined;

  const value = Number(raw);
  if (raw === undefined || raw === null || raw === "" || !Number.isFinite(value)) {
    throw new InvalidBodyError(`${key} must be a number.`, 400);
  }

  return value;
}

/**
 * Read an optional boolean field. Returns undefined when absent, and throws a
 * 400 when present with a non-boolean value, so a string `"false"` is rejected
 * at the transport layer rather than coerced into `true` downstream.
 */
export function readOptionalBoolean(
  body: unknown,
  key: string,
): boolean | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  if (!(key in body)) return undefined;

  const raw = (body as Record<string, unknown>)[key];
  if (typeof raw !== "boolean") {
    throw new InvalidBodyError(`${key} must be true or false.`, 400);
  }

  return raw;
}

/**
 * Read an optional number field. Returns undefined when absent, and throws a
 * 400 when present but not a finite number.
 */
export function readOptionalNumber(
  body: unknown,
  key: string,
): number | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  if (!(key in body)) return undefined;

  const value = Number((body as Record<string, unknown>)[key]);
  if (!Number.isFinite(value)) {
    throw new InvalidBodyError(`${key} must be a number.`, 400);
  }

  return value;
}

/** Read an optional trimmed string field, or undefined when absent or blank. */
export function readOptionalString(
  body: unknown,
  key: string,
): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;

  const raw = (body as Record<string, unknown>)[key];
  if (typeof raw !== "string") return undefined;
  return raw.trim() || undefined;
}
