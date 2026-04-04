import { NextResponse } from "next/server";

import { createSignupRequest } from "@/server/access-service";

function getSignupErrorMessage(message: string) {
  if (message === "EMAIL_REQUIRED") {
    return "이메일을 입력해주세요.";
  }
  if (message === "NAME_REQUIRED") {
    return "이름을 입력해주세요.";
  }
  if (message === "ACCOUNT_ALREADY_APPROVED") {
    return "이미 승인된 이메일입니다. 바로 로그인해주세요.";
  }
  if (message === "SIGNUP_REQUEST_ALREADY_PENDING") {
    return "이미 가입 신청이 접수되어 있습니다. 관리자 승인을 기다려주세요.";
  }

  return "가입 신청에 실패했습니다.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      cohort?: string | null;
      note?: string | null;
    };

    const signupRequest = await createSignupRequest({
      email: body.email ?? "",
      name: body.name ?? "",
      cohort: body.cohort,
      note: body.note,
    });

    return NextResponse.json({ signupRequest }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = [
      "EMAIL_REQUIRED",
      "NAME_REQUIRED",
      "ACCOUNT_ALREADY_APPROVED",
      "SIGNUP_REQUEST_ALREADY_PENDING",
    ].includes(message)
      ? 400
      : 500;

    return NextResponse.json({ message: getSignupErrorMessage(message) }, { status });
  }
}
