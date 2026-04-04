import { NextResponse } from "next/server";

import { listSignupRequests } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

export async function GET() {
  try {
    await requireAdminSession();
    const signupRequests = await listSignupRequests();
    return NextResponse.json({ signupRequests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "가입 신청 목록을 불러오지 못했습니다.";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}
