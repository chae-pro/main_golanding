import { NextResponse } from "next/server";

import { resetLandingAnalytics } from "@/server/analytics-service";
import { getLandingById } from "@/server/landing-service";
import { getCurrentCreatorSession } from "@/server/session-auth";

type RouteProps = {
  params: Promise<{ landingId: string }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const auth = await getCurrentCreatorSession();

  if (!auth) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { landingId } = await params;
  const landing = await getLandingById(landingId);

  if (!landing) {
    return NextResponse.json({ message: "랜딩을 찾을 수 없습니다." }, { status: 404 });
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    return NextResponse.json({ message: "권한이 없습니다." }, { status: 403 });
  }

  await resetLandingAnalytics(landingId);
  return NextResponse.json({ ok: true });
}
