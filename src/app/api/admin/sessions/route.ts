import { NextResponse } from "next/server";

import { listActiveSessions } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

export async function GET() {
  try {
    await requireAdminSession();
    const sessions = await listActiveSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sessions.";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}
