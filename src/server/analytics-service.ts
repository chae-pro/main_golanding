import { randomUUID } from "node:crypto";

import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsTargetType,
  FormSubmissionRecord,
  FormSubmissionValue,
  HeatmapPoint,
  LandingMetrics,
  LandingAnalysisVisuals,
  ScrollSectionMetric,
  VisitorSession,
} from "@/domain/types";
import { getDb } from "@/server/db";

const SECTION_COUNT = 20;
const IDLE_DISCARD_MS = 30_000;
const IDLE_EXCLUDE_MS = 60_000;

type VisitorSessionRow = {
  id: string;
  landing_id: string;
  started_at: string;
  last_activity_at: string;
  last_section_index: number;
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

function nowIso() {
  return new Date().toISOString();
}

function clampSectionIndex(sectionIndex: number) {
  return Math.min(Math.max(sectionIndex, 1), SECTION_COUNT);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function mapVisitorSession(row: VisitorSessionRow): VisitorSession {
  return {
    id: row.id,
    landingId: row.landing_id,
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    lastSectionIndex: row.last_section_index,
    maxScrollDepth: row.max_scroll_depth,
    excludedFromDwell: Boolean(row.excluded_from_dwell),
    validDwellMs: row.valid_dwell_ms,
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
}) {
  const db = await getDb();
  const timestamp = nowIso();
  const session: VisitorSession = {
    id: randomUUID(),
    landingId: input.landingId,
    startedAt: timestamp,
    lastActivityAt: timestamp,
    lastSectionIndex: clampSectionIndex(input.sectionIndex ?? 1),
    maxScrollDepth: round(input.scrollDepth ?? 0),
    excludedFromDwell: false,
    validDwellMs: 0,
    sectionDwellMs: Array.from({ length: SECTION_COUNT }, () => 0),
  };

  await db.run(
    `
    INSERT INTO visitor_sessions (
      id, landing_id, started_at, last_activity_at, last_section_index,
      max_scroll_depth, excluded_from_dwell, valid_dwell_ms, section_dwell_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      session.id,
      session.landingId,
      session.startedAt,
      session.lastActivityAt,
      session.lastSectionIndex,
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
  xRatio?: number;
  yRatio?: number;
  targetType?: AnalyticsTargetType;
  targetId?: string;
}) {
  const db = await getDb();
  const row = await db.one<VisitorSessionRow>(
    `
      SELECT id, landing_id, started_at, last_activity_at, last_section_index,
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
  const previous = new Date(session.lastActivityAt).getTime();
  const deltaMs = Math.max(timestamp.getTime() - previous, 0);
  const nextSectionIndex = clampSectionIndex(input.sectionIndex);

  let nextSession: VisitorSession = {
    ...session,
    lastActivityAt: timestamp.toISOString(),
    lastSectionIndex: nextSectionIndex,
    maxScrollDepth: Math.max(session.maxScrollDepth, round(input.scrollDepth ?? 0)),
  };

  if (!session.excludedFromDwell) {
    if (deltaMs >= IDLE_EXCLUDE_MS) {
      nextSession = {
        ...nextSession,
        excludedFromDwell: true,
      };
    } else if (deltaMs < IDLE_DISCARD_MS) {
      const sectionDwellMs = [...session.sectionDwellMs];
      const previousIndex = clampSectionIndex(session.lastSectionIndex) - 1;
      sectionDwellMs[previousIndex] += deltaMs;
      nextSession = {
        ...nextSession,
        validDwellMs: session.validDwellMs + deltaMs,
        sectionDwellMs,
      };
    }
  }

  const event: AnalyticsEvent = {
    id: randomUUID(),
    landingId: input.landingId,
    sessionId: input.sessionId,
    eventType: input.eventType,
    sectionIndex: nextSectionIndex,
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
      SET last_activity_at = ?, last_section_index = ?, max_scroll_depth = ?,
          excluded_from_dwell = ?, valid_dwell_ms = ?, section_dwell_json = ?
      WHERE id = ?
    `,
      [
        nextSession.lastActivityAt,
        nextSession.lastSectionIndex,
        nextSession.maxScrollDepth,
        nextSession.excludedFromDwell ? 1 : 0,
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

  const visitorCount = landingSessions.length;
  const totalClickCount = landingEvents.filter((item) => item.eventType === "click").length;
  const ctaClickCount = landingEvents.filter(
    (item) => item.eventType === "click" && item.targetType === "cta",
  ).length;
  const formSubmissionCount = submissions.length;
  const avgScrollDepth =
    visitorCount > 0
      ? round(
          landingSessions.reduce((sum, item) => sum + item.maxScrollDepth, 0) / visitorCount,
        )
      : 0;
  const scrollCompletionRate =
    visitorCount > 0
      ? round(
          (landingSessions.filter((item) => item.maxScrollDepth >= 95).length / visitorCount) *
            100,
        )
      : 0;

  const validSessions = landingSessions.filter(
    (item) => !item.excludedFromDwell && item.validDwellMs > 0,
  );
  const excludedSessions = landingSessions.filter((item) => item.excludedFromDwell);

  const dwellSections = Array.from({ length: SECTION_COUNT }, () => 0);

  for (const session of validSessions) {
    for (let index = 0; index < SECTION_COUNT; index += 1) {
      const normalized = (session.sectionDwellMs[index] / session.validDwellMs) * 100;
      dwellSections[index] += normalized;
    }
  }

  const roundedDwellSections = dwellSections.map((value) => round(value));
  const sectionEntries = roundedDwellSections.map((value, index) => ({
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
    visitorCount,
    totalClickCount,
    ctaClickCount,
    formSubmissionCount,
    avgScrollDepth,
    scrollCompletionRate,
    validDwellSessionCount: validSessions.length,
    excludedDwellSessionCount: excludedSessions.length,
    dwellSections: roundedDwellSections,
    topSections,
    weakSections,
  };
}

export async function getLandingAnalysisVisuals(
  landingId: string,
): Promise<LandingAnalysisVisuals> {
  const [sessions, events] = await Promise.all([listVisitorSessions(), listAnalyticsEvents()]);

  const landingSessions = sessions.filter((item) => item.landingId === landingId);
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

  const scrollSections: ScrollSectionMetric[] = Array.from({ length: SECTION_COUNT }, (_, index) => {
    const section = index + 1;
    const threshold = (section / SECTION_COUNT) * 100;
    const reachRate =
      landingSessions.length > 0
        ? round(
            (landingSessions.filter((item) => item.maxScrollDepth >= threshold).length /
              landingSessions.length) *
              100,
          )
        : 0;

    return {
      section,
      reachRate,
    };
  });

  return {
    heatmapPoints,
    scrollSections,
  };
}
