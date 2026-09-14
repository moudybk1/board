import { NextResponse } from "next/server";

import {
  getGuideSection,
  isGuideSection,
} from "@/server/services/guide.service";

type RouteContext = {
  params: Promise<{ section: string }>;
};

/**
 * GET /api/guide/[section] · one panduan section by path segment.
 * Same payload as `GET /api/guide?section=…`.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { section } = await context.params;

  if (!isGuideSection(section)) {
    return NextResponse.json(
      {
        error:
          "Invalid section. Use welcome, how-to, win-goals, rules, or token.",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      section,
      content: getGuideSection(section),
      source: "mock",
    });
  } catch (error) {
    console.error(`[GET /api/guide/${section}]`, error);
    return NextResponse.json(
      { error: "Failed to load guide content." },
      { status: 500 },
    );
  }
}
