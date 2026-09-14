import { NextResponse } from "next/server";

import {
  getFullGuide,
  getGuideSection,
  isGuideSection,
} from "@/server/services/guide.service";

/**
 * GET /api/guide · welcome & panduan content.
 *
 * Query:
 * - `section`  welcome | how-to | win-goals | rules | token
 *              (omit for the full bundle)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const section = url.searchParams.get("section");

  try {
    if (section) {
      if (!isGuideSection(section)) {
        return NextResponse.json(
          {
            error:
              "Invalid section. Use welcome, how-to, win-goals, rules, or token.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        section,
        content: getGuideSection(section),
        source: "mock",
      });
    }

    return NextResponse.json({
      guide: getFullGuide(),
      source: "mock",
    });
  } catch (error) {
    console.error("[GET /api/guide]", error);
    return NextResponse.json(
      { error: "Failed to load guide content." },
      { status: 500 },
    );
  }
}
