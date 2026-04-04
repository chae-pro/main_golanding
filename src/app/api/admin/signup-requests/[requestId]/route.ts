import { NextResponse } from "next/server";

import { reviewSignupRequest } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

function getReviewErrorMessage(message: string) {
  if (message === "SIGNUP_REQUEST_NOT_FOUND") {
    return "가입 신청 내역을 찾을 수 없습니다.";
  }
  if (message === "SIGNUP_REQUEST_ALREADY_REVIEWED") {
    return "이미 처리된 가입 신청입니다.";
  }

  return "가입 신청 처리에 실패했습니다.";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    await requireAdminSession();
    const { requestId } = await context.params;
    const body = (await request.json()) as {
      action?: "approve" | "reject";
    };

    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return NextResponse.json({ message: "처리 동작이 필요합니다." }, { status: 400 });
    }

    const signupRequest = await reviewSignupRequest({
      requestId,
      action: body.action,
    });

    return NextResponse.json({ signupRequest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "가입 신청 처리에 실패했습니다.";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : ["SIGNUP_REQUEST_NOT_FOUND", "SIGNUP_REQUEST_ALREADY_REVIEWED"].includes(message)
            ? 400
            : 500;

    return NextResponse.json({ message: getReviewErrorMessage(message) }, { status });
  }
}
