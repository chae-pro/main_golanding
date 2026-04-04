import { NextResponse } from "next/server";

import { startVisitorSession } from "@/server/analytics-service";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    landingId?: string;
    sectionIndex?: number;
    scrollDepth?: number;
  };

  if (!body.landingId) {
    return NextResponse.json({ message: "landingId is required." }, { status: 400 });
  }

  const session = await startVisitorSession({
    landingId: body.landingId,
    sectionIndex: body.sectionIndex,
    scrollDepth: body.scrollDepth,
  });

  return NextResponse.json({ session });
}
