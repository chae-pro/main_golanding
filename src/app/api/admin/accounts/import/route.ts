import { NextResponse } from "next/server";

import { requireAdminSession } from "@/server/admin-auth";
import { importApprovedAccountsFromCsv } from "@/server/approved-accounts-import";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as {
      csvText?: string;
    };

    if (!body.csvText?.trim()) {
      return NextResponse.json({ message: "CSV text is required." }, { status: 400 });
    }

    const result = await importApprovedAccountsFromCsv(body.csvText);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV import failed.";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message === "CSV_EMPTY"
            ? 400
            : 500;
    return NextResponse.json({ message }, { status });
  }
}
