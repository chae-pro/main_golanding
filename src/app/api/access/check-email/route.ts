import { NextResponse } from "next/server";

import { findApprovedAccountByEmail } from "@/server/access-service";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const account = await findApprovedAccountByEmail(email);

  return NextResponse.json({
    approved: Boolean(account),
    account: account
      ? {
          email: account.email,
          name: account.name,
          cohort: account.cohort,
        }
      : null,
  });
}
