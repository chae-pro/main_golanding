import { NextResponse } from "next/server";

import type { FormSubmissionValue } from "@/domain/types";
import { createFormSubmission, recordAnalyticsEvent } from "@/server/analytics-service";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    landingId?: string;
    sessionId?: string;
    sectionIndex?: number;
    scrollDepth?: number;
    viewportTopRatio?: number;
    viewportBottomRatio?: number;
    values?: FormSubmissionValue[];
  };

  if (!body.landingId || !body.values?.length) {
    return NextResponse.json(
      { message: "landingId and submitted values are required." },
      { status: 400 },
    );
  }

  const submission = await createFormSubmission({
    landingId: body.landingId,
    sessionId: body.sessionId,
    values: body.values,
  });

  if (body.sessionId && body.sectionIndex) {
    await recordAnalyticsEvent({
      landingId: body.landingId,
      sessionId: body.sessionId,
      eventType: "form_submit",
      sectionIndex: body.sectionIndex,
      scrollDepth: body.scrollDepth,
      viewportTopRatio: body.viewportTopRatio,
      viewportBottomRatio: body.viewportBottomRatio,
      targetType: "form",
      targetId: "form-submit",
    });
  }

  return NextResponse.json({ submission }, { status: 201 });
}
