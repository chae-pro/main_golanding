import { NextResponse } from "next/server";

import { createApprovedSession, SESSION_COOKIE_NAME } from "@/server/access-service";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
  };

  if (!body.email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const result = await createApprovedSession({
    email: body.email,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.reason }, { status: 403 });
  }

  const response = NextResponse.json({
    session: {
      id: result.session.id,
      email: result.session.email,
      expiresAt: result.session.expiresAt,
      status: result.session.status,
    },
    account: {
      id: result.account.id,
      email: result.account.email,
      name: result.account.name,
      cohort: result.account.cohort,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: result.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(result.session.expiresAt),
    path: "/",
  });

  return response;
}
