import type { AdminOverviewMetrics } from "@/domain/types";
import { getDb } from "@/server/db";

function daysAgoIso(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString();
}

export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  const db = await getDb();
  const recentThreshold = daysAgoIso(7);

  const [
    approvedAccounts,
    activeSessions,
    publishedLandings,
    totalLandings,
    recentVisitors,
    recentFormSubmissions,
  ] = await Promise.all([
    db.one<{ count: number | string }>(
      `
      SELECT COUNT(*) AS count
      FROM approved_accounts
      WHERE status = 'approved'
    `,
    ),
    db.one<{ count: number | string }>(
      `
      SELECT COUNT(*) AS count
      FROM creator_sessions
      WHERE status = 'active'
    `,
    ),
    db.one<{ count: number | string }>(
      `
      SELECT COUNT(*) AS count
      FROM landings
      WHERE status = 'published'
    `,
    ),
    db.one<{ count: number | string }>(
      `
      SELECT COUNT(*) AS count
      FROM landings
    `,
    ),
    db.one<{ count: number | string }>(
      `
      SELECT COUNT(*) AS count
      FROM visitor_sessions
      WHERE started_at >= ?
    `,
      [recentThreshold],
    ),
    db.one<{ count: number | string }>(
      `
      SELECT COUNT(*) AS count
      FROM form_submissions
      WHERE submitted_at >= ?
    `,
      [recentThreshold],
    ),
  ]);

  return {
    approvedAccountCount: Number(approvedAccounts?.count ?? 0),
    activeSessionCount: Number(activeSessions?.count ?? 0),
    publishedLandingCount: Number(publishedLandings?.count ?? 0),
    totalLandingCount: Number(totalLandings?.count ?? 0),
    recentVisitorCount: Number(recentVisitors?.count ?? 0),
    recentFormSubmissionCount: Number(recentFormSubmissions?.count ?? 0),
  };
}
