import { NextResponse } from "next/server";

import { startVisitorSession } from "@/server/analytics-service";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    landingId?: string;
    sectionIndex?: number;
    scrollDepth?: number;
    viewportTopRatio?: number;
    viewportBottomRatio?: number;
  };

  if (!body.landingId) {
    return NextResponse.json({ message: "landingId is required." }, { status: 400 });
  }

  const session = await startVisitorSession({
    landingId: body.landingId,
    sectionIndex: body.sectionIndex,
    scrollDepth: body.scrollDepth,
    viewportTopRatio: body.viewportTopRatio,
    viewportBottomRatio: body.viewportBottomRatio,
  });

  return NextResponse.json({ session });
}
