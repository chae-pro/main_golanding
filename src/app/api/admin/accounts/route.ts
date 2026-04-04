import { NextResponse } from "next/server";

import { createApprovedAccount, listApprovedAccounts } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

export async function GET() {
  try {
    await requireAdminSession();
    const accounts = await listApprovedAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load accounts.";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      cohort?: string | null;
      expiresAt?: string | null;
    };

    const account = await createApprovedAccount({
      email: body.email ?? "",
      name: body.name ?? "",
      cohort: body.cohort,
      expiresAt: body.expiresAt,
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create account.";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : [
                "EMAIL_REQUIRED",
                "NAME_REQUIRED",
                "ACCOUNT_ALREADY_EXISTS",
                "INVALID_EXPIRES_AT",
              ].includes(message)
            ? 400
            : 500;
    return NextResponse.json({ message }, { status });
  }
}
