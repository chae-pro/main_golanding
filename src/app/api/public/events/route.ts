import { NextResponse } from "next/server";

import type { AnalyticsEventType, AnalyticsTargetType } from "@/domain/types";
import { recordAnalyticsEvent } from "@/server/analytics-service";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    landingId?: string;
    sessionId?: string;
    eventType?: AnalyticsEventType;
    sectionIndex?: number;
    scrollDepth?: number;
    viewportTopRatio?: number;
    viewportBottomRatio?: number;
    xRatio?: number;
    yRatio?: number;
    targetType?: AnalyticsTargetType;
    targetId?: string;
  };

  if (!body.landingId || !body.sessionId || !body.eventType || !body.sectionIndex) {
    return NextResponse.json(
      { message: "landingId, sessionId, eventType, and sectionIndex are required." },
      { status: 400 },
    );
  }

  try {
    const event = await recordAnalyticsEvent({
      landingId: body.landingId,
      sessionId: body.sessionId,
      eventType: body.eventType,
      sectionIndex: body.sectionIndex,
      scrollDepth: body.scrollDepth,
      viewportTopRatio: body.viewportTopRatio,
      viewportBottomRatio: body.viewportBottomRatio,
      xRatio: body.xRatio,
      yRatio: body.yRatio,
      targetType: body.targetType,
      targetId: body.targetId,
    });

    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Event recording failed.";
    return NextResponse.json({ message }, { status: 404 });
  }
}
