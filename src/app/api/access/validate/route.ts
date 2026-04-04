import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/access-service";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "Token is required." }, { status: 400 });
  }

  const result = await validateSessionToken(token);

  if (!result.ok) {
    return NextResponse.json({ message: result.reason }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    session: {
      id: result.session.id,
      email: result.session.email,
      expiresAt: result.session.expiresAt,
      lastValidatedAt: result.session.lastValidatedAt,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    token?: string;
  };

  const cookieStore = await cookies();
  const token = body.token ?? cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "Token is required." }, { status: 400 });
  }

  const result = await validateSessionToken(token);

  if (!result.ok) {
    return NextResponse.json({ message: result.reason }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    session: {
      id: result.session.id,
      email: result.session.email,
      expiresAt: result.session.expiresAt,
      lastValidatedAt: result.session.lastValidatedAt,
    },
  });
}
