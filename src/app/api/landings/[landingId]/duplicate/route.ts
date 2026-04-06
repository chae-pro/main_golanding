import { NextResponse } from "next/server";

import { requireCreatorAuthSnapshot } from "@/server/creator-auth";
import { duplicateLanding } from "@/server/landing-service";

type RouteContext = {
  params: Promise<{ landingId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await requireCreatorAuthSnapshot();
    const { landingId } = await context.params;

    const landing = await duplicateLanding({
      landingId,
      ownerEmail: auth.session.email,
    });

    return NextResponse.json({ landing }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "랜딩 복사에 실패했습니다.";
    const status =
      message === "LANDING_NOT_FOUND" ? 404 : message === "FORBIDDEN" ? 403 : 401;

    return NextResponse.json(
      {
        message:
          message === "LANDING_NOT_FOUND"
            ? "랜딩을 찾을 수 없습니다."
            : message === "FORBIDDEN"
              ? "접근 권한이 없습니다."
              : message,
      },
      { status },
    );
  }
}
