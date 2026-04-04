import { randomUUID } from "node:crypto";

import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsTargetType,
  FormSubmissionRecord,
  FormSubmissionValue,
  HeatmapPoint,
  LandingAnalysisVisuals,
  LandingMetrics,
  ScrollSectionMetric,
  VisitorSession,
} from "@/domain/types";
import { getDb } from "@/server/db";

const SECTION_COUNT = 20;
const MIN_VIEWPORT_BOTTOM_RATIO = 0.05;

type VisitorSessionRow = {
  id: string;
  landing_id: string;
  started_at: string;
  last_activity_at: string;
  last_section_index: number;
  last_viewport_top_ratio: number;
  last_viewport_bottom_ratio: number;
  max_visible_section_index: number;
  max_scroll_depth: number;
  excluded_from_dwell: number;
  valid_dwell_ms: number;
  section_dwell_json: string;
};

type AnalyticsEventRow = {
  id: string;
  landing_id: string;
  session_id: string;
  event_type: AnalyticsEventType;
  section_index: number;
  scroll_depth: number | null;
  x_ratio: number | null;
  y_ratio: number | null;
  target_type: AnalyticsTargetType | null;
  target_id: string | null;
  occurred_at: string;
};

type FormSubmissionRow = {
  id: string;
  landing_id: string;
  session_id: string | null;
  submitted_at: string;
  values_json: string;
};

type ViewportRange = {
  topRatio: number;
  bottomRatio: number;
};

export type LandingSessionDebugRow = {
  sessionId: string;
  startedAt: string;
  lastActivityAt: string;
  validDwellMs: number;
  maxVisibleSectionIndex: number;
  topSections: Array<{ section: number; percent: number; ms: number }>;
};

function nowIso() {
  return new Date().toISOString();
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampSectionIndex(sectionIndex: number) {
  return Math.min(Math.max(sectionIndex, 1), SECTION_COUNT);
}

function normalizeViewportRange(topRatio?: number, bottomRatio?: number): ViewportRange {
  const safeTop = clamp(topRatio ?? 0, 0, 1);
  const safeBottom = clamp(bottomRatio ?? MIN_VIEWPORT_BOTTOM_RATIO, 0, 1);

  return {
    topRatio: safeTop,
    bottomRatio: safeBottom >= safeTop ? safeBottom : safeTop,
  };
}

function getSectionOverlapRatios(range: ViewportRange) {
  const height = range.bottomRatio - range.topRatio;

  if (height <= 0) {
    return Array.from({ length: SECTION_COUNT }, () => 0);
  }

  return Array.from({ length: SECTION_COUNT }, (_, index) => {
    const sectionTop = index / SECTION_COUNT;
    const sectionBottom = (index + 1) / SECTION_COUNT;
    const overlap = Math.max(
      0,
      Math.min(range.bottomRatio, sectionBottom) - Math.max(range.topRatio, sectionTop),
    );
    return overlap / height;
  });
}

function getSectionIndexFromViewport(range: ViewportRange) {
  if (range.bottomRatio <= range.topRatio) {
    return 1;
  }

  const midpoint = (range.topRatio + range.bottomRatio) / 2;
  return clampSectionIndex(Math.floor(midpoint * SECTION_COUNT) + 1);
}

function getMaxVisibleSectionIndex(range: ViewportRange) {
  if (range.bottomRatio <= range.topRatio) {
    return 0;
  }

  return clampSectionIndex(Math.ceil(range.bottomRatio * SECTION_COUNT));
}

function distributeDwellAcrossViewport(
  sectionDwellMs: number[],
  range: ViewportRange,
  deltaMs: number,
) {
  const next = [...sectionDwellMs];
  const overlaps = getSectionOverlapRatios(range);

  overlaps.forEach((ratio, index) => {
    if (ratio <= 0) {
      return;
    }

    next[index] += deltaMs * ratio;
  });

  return next;
}

function getNormalizedDwellSections(sessions: VisitorSession[]) {
  if (sessions.length === 0) {
    return Array.from({ length: SECTION_COUNT }, () => 0);
  }

  const totals = Array.from({ length: SECTION_COUNT }, () => 0);
  let validSessionCount = 0;

  for (const session of sessions) {
    if (session.validDwellMs <= 0) {
      continue;
    }

    validSessionCount += 1;

    for (let index = 0; index < SECTION_COUNT; index += 1) {
      const value = (session.sectionDwellMs[index] / session.validDwellMs) * 100;
      totals[index] += value;
    }
  }

  if (validSessionCount === 0) {
    return Array.from({ length: SECTION_COUNT }, () => 0);
  }

  return totals.map((value) => round(value / validSessionCount));
}

function mapVisitorSession(row: VisitorSessionRow): VisitorSession {
  return {
    id: row.id,
    landingId: row.landing_id,
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    lastSectionIndex: row.last_section_index,
    lastViewportTopRatio: Number(row.last_viewport_top_ratio ?? 0),
    lastViewportBottomRatio: Number(row.last_viewport_bottom_ratio ?? MIN_VIEWPORT_BOTTOM_RATIO),
    maxVisibleSectionIndex: Number(row.max_visible_section_index ?? 1),
    maxScrollDepth: Number(row.max_scroll_depth),
    excludedFromDwell: false,
    validDwellMs: Number(row.valid_dwell_ms),
    sectionDwellMs: JSON.parse(row.section_dwell_json) as number[],
  };
}

function mapAnalyticsEvent(row: AnalyticsEventRow): AnalyticsEvent {
  return {
    id: row.id,
    landingId: row.landing_id,
    sessionId: row.session_id,
    eventType: row.event_type,
    sectionIndex: row.section_index,
    scrollDepth: row.scroll_depth ?? undefined,
    xRatio: row.x_ratio ?? undefined,
    yRatio: row.y_ratio ?? undefined,
    targetType: row.target_type ?? undefined,
    targetId: row.target_id ?? undefined,
    occurredAt: row.occurred_at,
  };
}

function mapFormSubmission(row: FormSubmissionRow): FormSubmissionRecord {
  return {
    id: row.id,
    landingId: row.landing_id,
    sessionId: row.session_id,
    submittedAt: row.submitted_at,
    values: JSON.parse(row.values_json) as FormSubmissionValue[],
  };
}

export async function listVisitorSessions() {
  const db = await getDb();
  const rows = await db.many<VisitorSessionRow>(
    `
      SELECT id, landing_id, started_at, last_activity_at, last_section_index,
             last_viewport_top_ratio, last_viewport_bottom_ratio, max_visible_section_index,
             max_scroll_depth, excluded_from_dwell, valid_dwell_ms, section_dwell_json
      FROM visitor_sessions
      ORDER BY started_at DESC
    `,
  );

  return rows.map(mapVisitorSession);
}

export async function listAnalyticsEvents() {
  const db = await getDb();
  const rows = await db.many<AnalyticsEventRow>(
    `
      SELECT id, landing_id, session_id, event_type, section_index, scroll_depth,
             x_ratio, y_ratio, target_type, target_id, occurred_at
      FROM analytics_events
      ORDER BY occurred_at DESC
    `,
  );

  return rows.map(mapAnalyticsEvent);
}

export async function listFormSubmissions() {
  const db = await getDb();
  const rows = await db.many<FormSubmissionRow>(
    `
      SELECT id, landing_id, session_id, submitted_at, values_json
      FROM form_submissions
      ORDER BY submitted_at DESC
    `,
  );

  return rows.map(mapFormSubmission);
}

export async function listFormSubmissionsByLanding(landingId: string) {
  const db = await getDb();
  const rows = await db.many<FormSubmissionRow>(
    `
      SELECT id, landing_id, session_id, submitted_at, values_json
      FROM form_submissions
      WHERE landing_id = ?
      ORDER BY submitted_at DESC
    `,
    [landingId],
  );

  return rows.map(mapFormSubmission);
}

export async function startVisitorSession(input: {
  landingId: string;
  sectionIndex?: number;
  scrollDepth?: number;
  viewportTopRatio?: number;
  viewportBottomRatio?: number;
}) {
  const db = await getDb();
  const timestamp = nowIso();
  const viewport = normalizeViewportRange(input.viewportTopRatio, input.viewportBottomRatio);
  const session: VisitorSession = {
    id: randomUUID(),
    landingId: input.landingId,
    startedAt: timestamp,
    lastActivityAt: timestamp,
    lastSectionIndex: clampSectionIndex(input.sectionIndex ?? getSectionIndexFromViewport(viewport)),
    lastViewportTopRatio: viewport.topRatio,
    lastViewportBottomRatio: viewport.bottomRatio,
    maxVisibleSectionIndex: getMaxVisibleSectionIndex(viewport),
    maxScrollDepth: round(input.scrollDepth ?? 0),
    excludedFromDwell: false,
    validDwellMs: 0,
    sectionDwellMs: Array.from({ length: SECTION_COUNT }, () => 0),
  };

  await db.run(
    `
    INSERT INTO visitor_sessions (
      id, landing_id, started_at, last_activity_at, last_section_index,
      last_viewport_top_ratio, last_viewport_bottom_ratio, max_visible_section_index,
      max_scroll_depth, excluded_from_dwell, valid_dwell_ms, section_dwell_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      session.id,
      session.landingId,
      session.startedAt,
      session.lastActivityAt,
      session.lastSectionIndex,
      session.lastViewportTopRatio,
      session.lastViewportBottomRatio,
      session.maxVisibleSectionIndex,
      session.maxScrollDepth,
      0,
      session.validDwellMs,
      JSON.stringify(session.sectionDwellMs),
    ],
  );

  return session;
}

export async function recordAnalyticsEvent(input: {
  landingId: string;
  sessionId: string;
  eventType: AnalyticsEventType;
  sectionIndex: number;
  scrollDepth?: number;
  viewportTopRatio?: number;
  viewportBottomRatio?: number;
  xRatio?: number;
  yRatio?: number;
  targetType?: AnalyticsTargetType;
  targetId?: string;
}) {
  const db = await getDb();
  const row = await db.one<VisitorSessionRow>(
    `
      SELECT id, landing_id, started_at, last_activity_at, last_section_index,
             last_viewport_top_ratio, last_viewport_bottom_ratio, max_visible_section_index,
             max_scroll_depth, excluded_from_dwell, valid_dwell_ms, section_dwell_json
      FROM visitor_sessions
      WHERE id = ? AND landing_id = ?
      LIMIT 1
    `,
    [input.sessionId, input.landingId],
  );

  if (!row) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const session = mapVisitorSession(row);
  const timestamp = new Date();
  const previousTime = new Date(session.lastActivityAt).getTime();
  const deltaMs = Math.max(timestamp.getTime() - previousTime, 0);
  const currentViewport = normalizeViewportRange(input.viewportTopRatio, input.viewportBottomRatio);
  const previousViewport = normalizeViewportRange(
    session.lastViewportTopRatio,
    session.lastViewportBottomRatio,
  );

  const nextSession: VisitorSession = {
    ...session,
    lastActivityAt: timestamp.toISOString(),
    lastSectionIndex: clampSectionIndex(input.sectionIndex ?? getSectionIndexFromViewport(currentViewport)),
    lastViewportTopRatio: currentViewport.topRatio,
    lastViewportBottomRatio: currentViewport.bottomRatio,
    maxVisibleSectionIndex: Math.max(
      session.maxVisibleSectionIndex,
      getMaxVisibleSectionIndex(currentViewport),
    ),
    maxScrollDepth: Math.max(session.maxScrollDepth, round(input.scrollDepth ?? 0)),
    excludedFromDwell: false,
    validDwellMs: session.validDwellMs + deltaMs,
    sectionDwellMs: distributeDwellAcrossViewport(session.sectionDwellMs, previousViewport, deltaMs),
  };

  const event: AnalyticsEvent = {
    id: randomUUID(),
    landingId: input.landingId,
    sessionId: input.sessionId,
    eventType: input.eventType,
    sectionIndex: nextSession.lastSectionIndex,
    scrollDepth: input.scrollDepth,
    xRatio: input.xRatio,
    yRatio: input.yRatio,
    targetType: input.targetType,
    targetId: input.targetId,
    occurredAt: timestamp.toISOString(),
  };

  await db.transaction(async (tx) => {
    await tx.run(
      `
      UPDATE visitor_sessions
      SET last_activity_at = ?, last_section_index = ?,
          last_viewport_top_ratio = ?, last_viewport_bottom_ratio = ?,
          max_visible_section_index = ?, max_scroll_depth = ?,
          excluded_from_dwell = ?, valid_dwell_ms = ?, section_dwell_json = ?
      WHERE id = ?
    `,
      [
        nextSession.lastActivityAt,
        nextSession.lastSectionIndex,
        nextSession.lastViewportTopRatio,
        nextSession.lastViewportBottomRatio,
        nextSession.maxVisibleSectionIndex,
        nextSession.maxScrollDepth,
        0,
        nextSession.validDwellMs,
        JSON.stringify(nextSession.sectionDwellMs),
        nextSession.id,
      ],
    );

    await tx.run(
      `
      INSERT INTO analytics_events (
        id, landing_id, session_id, event_type, section_index, scroll_depth,
        x_ratio, y_ratio, target_type, target_id, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        event.id,
        event.landingId,
        event.sessionId,
        event.eventType,
        event.sectionIndex,
        event.scrollDepth ?? null,
        event.xRatio ?? null,
        event.yRatio ?? null,
        event.targetType ?? null,
        event.targetId ?? null,
        event.occurredAt,
      ],
    );
  });

  return event;
}

export async function createFormSubmission(input: {
  landingId: string;
  sessionId?: string | null;
  values: FormSubmissionValue[];
}) {
  const db = await getDb();
  const record: FormSubmissionRecord = {
    id: randomUUID(),
    landingId: input.landingId,
    sessionId: input.sessionId ?? null,
    submittedAt: nowIso(),
    values: input.values,
  };

  await db.run(
    `
    INSERT INTO form_submissions (id, landing_id, session_id, submitted_at, values_json)
    VALUES (?, ?, ?, ?, ?)
  `,
    [
      record.id,
      record.landingId,
      record.sessionId,
      record.submittedAt,
      JSON.stringify(record.values),
    ],
  );

  return record;
}

export async function getLandingMetrics(landingId: string): Promise<LandingMetrics> {
  const [sessions, events, submissions] = await Promise.all([
    listVisitorSessions(),
    listAnalyticsEvents(),
    listFormSubmissionsByLanding(landingId),
  ]);

  const landingSessions = sessions.filter((item) => item.landingId === landingId);
  const landingEvents = events.filter((item) => item.landingId === landingId);
  const validSessions = landingSessions.filter((item) => item.validDwellMs > 0);
  const dwellSections = getNormalizedDwellSections(validSessions);
  const avgDwellSeconds =
    validSessions.length > 0
      ? round(
          validSessions.reduce((sum, item) => sum + item.validDwellMs, 0) /
            validSessions.length /
            1000,
        )
      : 0;

  const sectionEntries = dwellSections.map((value, index) => ({
    section: index + 1,
    value,
  }));

  const topSections = [...sectionEntries]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => item.section);

  const weakSections = [...sectionEntries]
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((item) => item.section);

  return {
    visitorCount: landingSessions.length,
    totalClickCount: landingEvents.filter((item) => item.eventType === "click").length,
    ctaClickCount: landingEvents.filter(
      (item) => item.eventType === "click" && item.targetType === "cta",
    ).length,
    formSubmissionCount: submissions.length,
    avgScrollDepth:
      landingSessions.length > 0
        ? round(
            landingSessions.reduce((sum, item) => sum + item.maxScrollDepth, 0) /
              landingSessions.length,
          )
        : 0,
    avgDwellSeconds,
    scrollCompletionRate:
      landingSessions.length > 0
        ? round(
            (landingSessions.filter((item) => item.maxVisibleSectionIndex >= SECTION_COUNT).length /
              landingSessions.length) *
              100,
          )
        : 0,
    validDwellSessionCount: validSessions.length,
    excludedDwellSessionCount: 0,
    dwellSections,
    topSections,
    weakSections,
  };
}

export async function getLandingAnalysisVisuals(
  landingId: string,
): Promise<LandingAnalysisVisuals> {
  const [sessions, events] = await Promise.all([listVisitorSessions(), listAnalyticsEvents()]);

  const landingSessions = sessions.filter((item) => item.landingId === landingId);
  const validSessions = landingSessions.filter((item) => item.validDwellMs > 0);
  const normalizedSections = getNormalizedDwellSections(validSessions);
  const clickEvents = events.filter(
    (item) =>
      item.landingId === landingId &&
      item.eventType === "click" &&
      typeof item.xRatio === "number" &&
      typeof item.yRatio === "number",
  );

  const heatmapPoints: HeatmapPoint[] = clickEvents.map((event) => ({
    id: event.id,
    xRatio: event.xRatio ?? 0,
    yRatio: event.yRatio ?? 0,
    targetType: event.targetType ?? "page",
  }));

  const scrollSections: ScrollSectionMetric[] = Array.from({ length: SECTION_COUNT }, (_, index) => ({
    section: index + 1,
    reachRate: normalizedSections[index],
    reachedSessionCount: validSessions.filter((item) => item.sectionDwellMs[index] > 0).length,
    totalSessionCount: validSessions.length,
  }));

  return {
    heatmapPoints,
    scrollSections,
    dwellSections: normalizedSections,
  };
}

export async function getLandingSessionDebugRows(landingId: string) {
  const sessions = await listVisitorSessions();

  return sessions
    .filter((item) => item.landingId === landingId && item.validDwellMs > 0)
    .slice(0, 20)
    .map<LandingSessionDebugRow>((session) => {
      const topSections = session.sectionDwellMs
        .map((ms, index) => ({
          section: index + 1,
          ms: round(ms),
          percent: session.validDwellMs > 0 ? round((ms / session.validDwellMs) * 100) : 0,
        }))
        .filter((item) => item.ms > 0)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 5);

      return {
        sessionId: session.id,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
        validDwellMs: session.validDwellMs,
        maxVisibleSectionIndex: session.maxVisibleSectionIndex,
        topSections,
      };
    });
}

export async function resetLandingAnalytics(landingId: string) {
  const db = await getDb();

  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM analytics_events WHERE landing_id = ?", [landingId]);
    await tx.run("DELETE FROM visitor_sessions WHERE landing_id = ?", [landingId]);
    await tx.run("DELETE FROM form_submissions WHERE landing_id = ?", [landingId]);
  });
}
