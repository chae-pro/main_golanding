import { NextResponse } from "next/server";

import { updateApprovedAccount } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";
import type { ApprovedAccount } from "@/domain/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    await requireAdminSession();
    const { accountId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      cohort?: string | null;
      status?: ApprovedAccount["status"];
      expiresAt?: string | null;
    };

    const account = await updateApprovedAccount({
      accountId,
      name: body.name ?? "",
      cohort: body.cohort,
      status: body.status ?? "approved",
      expiresAt: body.expiresAt,
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update account.";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : ["ACCOUNT_NOT_FOUND", "NAME_REQUIRED", "INVALID_EXPIRES_AT"].includes(message)
            ? 400
            : 500;
    return NextResponse.json({ message }, { status });
  }
}
