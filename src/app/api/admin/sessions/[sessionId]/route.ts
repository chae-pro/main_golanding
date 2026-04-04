import { NextResponse } from "next/server";

import { revokeSessionById } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireAdminSession();
    const { sessionId } = await context.params;
    const result = await revokeSessionById(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke session.";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message === "SESSION_NOT_FOUND"
            ? 404
            : 500;
    return NextResponse.json({ message }, { status });
  }
}
