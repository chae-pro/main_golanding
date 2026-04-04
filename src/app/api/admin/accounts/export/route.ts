import { NextResponse } from "next/server";

import { listApprovedAccounts } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

function escapeCsvCell(value: string | null | undefined) {
  const normalized = value ?? "";

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export async function GET() {
  try {
    await requireAdminSession();
    const accounts = await listApprovedAccounts();
    const header = [
      "id",
      "email",
      "name",
      "cohort",
      "status",
      "expiresAt",
      "createdAt",
      "updatedAt",
    ];
    const rows = accounts.map((account) =>
      [
        account.id,
        account.email,
        account.name,
        account.cohort ?? "",
        account.status,
        account.expiresAt ?? "",
        account.createdAt,
        account.updatedAt,
      ]
        .map((cell) => escapeCsvCell(cell))
        .join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");
    const fileName = `golanding-approved-accounts-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export accounts.";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}
