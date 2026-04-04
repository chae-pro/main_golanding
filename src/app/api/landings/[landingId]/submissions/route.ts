import { NextResponse } from "next/server";

import { listFormSubmissionsByLanding } from "@/server/analytics-service";
import { requireCreatorAuth } from "@/server/creator-auth";
import { getLandingById } from "@/server/landing-service";

type RouteContext = {
  params: Promise<{ landingId: string }>;
};

function escapeCsv(value: string) {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireCreatorAuth();
  const { landingId } = await context.params;
  const landing = await getLandingById(landingId);

  if (!landing) {
    return NextResponse.json({ message: "Landing not found." }, { status: 404 });
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const submissions = await listFormSubmissionsByLanding(landingId);
  const fieldLabels = Array.from(
    new Set(submissions.flatMap((submission) => submission.values.map((value) => value.label))),
  );

  const header = ["landing_id", "submission_id", "submitted_at", ...fieldLabels];
  const rows = submissions.map((submission) => {
    const valueMap = new Map(submission.values.map((value) => [value.label, value.value]));
    return [
      submission.landingId,
      submission.id,
      submission.submittedAt,
      ...fieldLabels.map((label) => valueMap.get(label) ?? ""),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${landing.publicSlug}-submissions.csv"`,
    },
  });
}
