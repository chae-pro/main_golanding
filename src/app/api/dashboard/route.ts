import { NextResponse } from "next/server";

import { getLandingDashboardMetrics } from "@/server/analytics-service";
import { isAdminEmail } from "@/server/admin-auth";
import { requireCreatorAuthSnapshot } from "@/server/creator-auth";
import { listLandingSummariesByOwner } from "@/server/landing-service";

function getLandingTypeLabel(type: "button" | "form" | "html") {
  if (type === "button") {
    return "버튼형";
  }
  if (type === "form") {
    return "DB 수집형";
  }
  return "HTML 삽입형";
}

function getLandingStatusLabel(status: "draft" | "published" | "archived") {
  if (status === "published") {
    return "사용 중";
  }
  if (status === "archived") {
    return "사용중지";
  }
  return "발행전";
}

export async function GET() {
  try {
    const auth = await requireCreatorAuthSnapshot();
    const email = auth.session.email;
    const adminAccess = isAdminEmail(email);
    const landings = await listLandingSummariesByOwner(email);
    const landingMetrics = await getLandingDashboardMetrics(landings.map((landing) => landing.id));

    const items = landings.map((landing) => {
      const metrics = landingMetrics.get(landing.id) ?? {
        visitorCount: 0,
        totalClickCount: 0,
        formSubmissionCount: 0,
      };

      return {
        id: landing.id,
        title: landing.title,
        createdAt: landing.createdAt,
        typeLabel: getLandingTypeLabel(landing.type),
        statusLabel: getLandingStatusLabel(landing.status),
        publicSlug: landing.publicSlug,
        description: landing.description,
        visitorCount: metrics.visitorCount,
        clickCount: metrics.totalClickCount,
        isPublished: landing.status === "published",
      };
    });

    const totals = {
      landingCount: items.length,
      totalVisitors: items.reduce((sum, item) => sum + item.visitorCount, 0),
      totalClicks: items.reduce((sum, item) => sum + item.clickCount, 0),
      totalForms: landings.reduce(
        (sum, landing) => sum + (landingMetrics.get(landing.id)?.formSubmissionCount ?? 0),
        0,
      ),
    };

    return NextResponse.json({
      email,
      adminAccess,
      items,
      totals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    return NextResponse.json({ message }, { status: 401 });
  }
}
