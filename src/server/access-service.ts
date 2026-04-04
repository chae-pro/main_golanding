import { randomUUID } from "node:crypto";

import type {
  AccessTokenPayload,
  AdminCreatorSession,
  ApprovedAccount,
  CouponCode,
  CreatorSession,
  SignupRequest,
} from "@/domain/types";
import { createAccessToken, verifyAccessToken } from "@/lib/token";
import { buildAdminDisplayName, getConfiguredAdminEmails } from "@/server/admin-config";
import { getDb } from "@/server/db";

const SESSION_VALIDITY_DAYS = 7;
export const SESSION_COOKIE_NAME = "golanding_session";

type ApprovedAccountRow = {
  id: string;
  email: string;
  name: string;
  cohort: string | null;
  status: ApprovedAccount["status"];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreatorSessionRow = {
  id: string;
  approved_account_id: string;
  email: string;
  token_version: number;
  expires_at: string;
  status: CreatorSession["status"];
  last_validated_at: string;
  created_at: string;
  updated_at: string;
  approved_status?: ApprovedAccount["status"];
  approved_expires_at?: string | null;
  approved_name?: string;
  approved_cohort?: string | null;
};

type SignupRequestRow = {
  id: string;
  email: string;
  name: string;
  cohort: string | null;
  coupon: string | null;
  note: string | null;
  status: SignupRequest["status"];
  created_at: string;
  updated_at: string;
};

type CouponCodeRow = {
  id: string;
  code: string;
  valid_days: number;
  max_uses: number;
  status: CouponCode["status"];
  created_at: string;
  updated_at: string;
  redeemed_count?: number | string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function computeExpiry(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString();
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeExpiryInput(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T23:59:59.999Z`
    : trimmed;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_EXPIRES_AT");
  }

  return parsed.toISOString();
}

function isAccountActive(account: Pick<ApprovedAccount, "status" | "expiresAt">) {
  if (account.status !== "approved") {
    return false;
  }

  if (account.expiresAt && new Date(account.expiresAt).getTime() < Date.now()) {
    return false;
  }

  return true;
}

function mapApprovedAccount(row: ApprovedAccountRow): ApprovedAccount {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    cohort: row.cohort ?? undefined,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCreatorSession(row: CreatorSessionRow): CreatorSession {
  return {
    id: row.id,
    approvedAccountId: row.approved_account_id,
    email: row.email,
    tokenVersion: row.token_version,
    expiresAt: row.expires_at,
    status: row.status,
    lastValidatedAt: row.last_validated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminCreatorSession(row: CreatorSessionRow): AdminCreatorSession {
  return {
    ...mapCreatorSession(row),
    accountName: row.approved_name ?? row.email,
    cohort: row.approved_cohort ?? undefined,
  };
}

function mapSignupRequest(row: SignupRequestRow): SignupRequest {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    cohort: row.cohort ?? undefined,
    coupon: row.coupon ?? undefined,
    note: row.note ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCouponCode(row: CouponCodeRow): CouponCode {
  const redeemedCount = Number(row.redeemed_count ?? 0);
  const maxUses = Number(row.max_uses);

  return {
    id: row.id,
    code: row.code,
    validDays: Number(row.valid_days),
    maxUses,
    status: row.status,
    redeemedCount,
    remainingUses: Math.max(0, maxUses - redeemedCount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCouponCode(code?: string | null) {
  const trimmed = code?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

function computeCouponExpiry(validDays: number) {
  const value = new Date();
  value.setDate(value.getDate() + validDays);
  return value.toISOString();
}

async function ensureConfiguredAdminAccounts() {
  const adminEmails = getConfiguredAdminEmails();

  if (adminEmails.length === 0) {
    return;
  }

  const db = await getDb();
  const timestamp = nowIso();

  for (const email of adminEmails) {
    const existing = await db.one<ApprovedAccountRow>(
      `
      SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
      FROM approved_accounts
      WHERE lower(email) = ?
      LIMIT 1
    `,
      [email],
    );

    if (!existing) {
      await db.run(
        `
        INSERT INTO approved_accounts (
          id, email, name, cohort, status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          randomUUID(),
          email,
          buildAdminDisplayName(email),
          "system-admin",
          "approved",
          null,
          timestamp,
          timestamp,
        ],
      );
      continue;
    }

    if (existing.status !== "approved" || existing.expires_at !== null) {
      await db.run(
        `
        UPDATE approved_accounts
        SET status = 'approved', expires_at = NULL, updated_at = ?
        WHERE id = ?
      `,
        [timestamp, existing.id],
      );
    }
  }
}

export async function listApprovedAccounts() {
  await ensureConfiguredAdminAccounts();
  const db = await getDb();
  const rows = await db.many<ApprovedAccountRow>(
    `
      SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
      FROM approved_accounts
      ORDER BY created_at DESC
    `,
  );

  return rows.map(mapApprovedAccount);
}

export async function listCouponCodes() {
  const db = await getDb();
  const rows = await db.many<CouponCodeRow>(
    `
      SELECT
        c.id,
        c.code,
        c.valid_days,
        c.max_uses,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(r.id) AS redeemed_count
      FROM coupon_codes c
      LEFT JOIN coupon_redemptions r ON r.coupon_id = c.id
      GROUP BY c.id, c.code, c.valid_days, c.max_uses, c.status, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
    `,
  );

  return rows.map(mapCouponCode);
}

export async function createCouponCode(input: {
  code: string;
  validDays: number;
  maxUses: number;
}) {
  const db = await getDb();
  const code = normalizeCouponCode(input.code);
  const validDays = Number(input.validDays);
  const maxUses = Number(input.maxUses);

  if (!code) {
    throw new Error("COUPON_CODE_REQUIRED");
  }

  if (!Number.isInteger(validDays) || validDays <= 0) {
    throw new Error("COUPON_VALID_DAYS_INVALID");
  }

  if (!Number.isInteger(maxUses) || maxUses <= 0) {
    throw new Error("COUPON_MAX_USES_INVALID");
  }

  const existing = await db.one<CouponCodeRow>(
    `
      SELECT id, code, valid_days, max_uses, status, created_at, updated_at
      FROM coupon_codes
      WHERE code = ?
      LIMIT 1
    `,
    [code],
  );

  if (existing) {
    throw new Error("COUPON_CODE_ALREADY_EXISTS");
  }

  const now = nowIso();
  const coupon: CouponCode = {
    id: randomUUID(),
    code,
    validDays,
    maxUses,
    status: "active",
    redeemedCount: 0,
    remainingUses: maxUses,
    createdAt: now,
    updatedAt: now,
  };

  await db.run(
    `
      INSERT INTO coupon_codes (
        id, code, valid_days, max_uses, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      coupon.id,
      coupon.code,
      coupon.validDays,
      coupon.maxUses,
      coupon.status,
      coupon.createdAt,
      coupon.updatedAt,
    ],
  );

  return coupon;
}

export async function updateCouponCode(input: {
  couponId: string;
  validDays: number;
  maxUses: number;
}) {
  const db = await getDb();
  const validDays = Number(input.validDays);
  const maxUses = Number(input.maxUses);

  if (!Number.isInteger(validDays) || validDays <= 0) {
    throw new Error("COUPON_VALID_DAYS_INVALID");
  }

  if (!Number.isInteger(maxUses) || maxUses <= 0) {
    throw new Error("COUPON_MAX_USES_INVALID");
  }

  const existing = await db.one<CouponCodeRow>(
    `
      SELECT
        c.id,
        c.code,
        c.valid_days,
        c.max_uses,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(r.id) AS redeemed_count
      FROM coupon_codes c
      LEFT JOIN coupon_redemptions r ON r.coupon_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, c.code, c.valid_days, c.max_uses, c.status, c.created_at, c.updated_at
      LIMIT 1
    `,
    [input.couponId],
  );

  if (!existing) {
    throw new Error("COUPON_NOT_FOUND");
  }

  const redeemedCount = Number(existing.redeemed_count ?? 0);

  if (maxUses < redeemedCount) {
    throw new Error("COUPON_MAX_USES_BELOW_REDEEMED");
  }

  await db.run(
    `
      UPDATE coupon_codes
      SET valid_days = ?, max_uses = ?, updated_at = ?
      WHERE id = ?
    `,
    [validDays, maxUses, nowIso(), input.couponId],
  );

  const updated = await db.one<CouponCodeRow>(
    `
      SELECT
        c.id,
        c.code,
        c.valid_days,
        c.max_uses,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(r.id) AS redeemed_count
      FROM coupon_codes c
      LEFT JOIN coupon_redemptions r ON r.coupon_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, c.code, c.valid_days, c.max_uses, c.status, c.created_at, c.updated_at
      LIMIT 1
    `,
    [input.couponId],
  );

  if (!updated) {
    throw new Error("COUPON_NOT_FOUND");
  }

  return mapCouponCode(updated);
}

export async function deleteCouponCode(couponId: string) {
  const db = await getDb();
  const existing = await db.one<CouponCodeRow>(
    `
      SELECT
        c.id,
        c.code,
        c.valid_days,
        c.max_uses,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(r.id) AS redeemed_count
      FROM coupon_codes c
      LEFT JOIN coupon_redemptions r ON r.coupon_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, c.code, c.valid_days, c.max_uses, c.status, c.created_at, c.updated_at
      LIMIT 1
    `,
    [couponId],
  );

  if (!existing) {
    throw new Error("COUPON_NOT_FOUND");
  }

  if (Number(existing.redeemed_count ?? 0) > 0) {
    throw new Error("COUPON_ALREADY_REDEEMED");
  }

  await db.run("DELETE FROM coupon_codes WHERE id = ?", [couponId]);
  return { ok: true as const };
}

export async function listSignupRequests() {
  const db = await getDb();
  const rows = await db.many<SignupRequestRow>(
    `
      SELECT id, email, name, cohort, coupon, note, status, created_at, updated_at
      FROM signup_requests
      ORDER BY
        CASE status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          ELSE 2
        END,
        created_at DESC
    `,
  );

  return rows.map(mapSignupRequest);
}

export async function createSignupRequest(input: {
  email: string;
  name: string;
  cohort?: string | null;
  coupon?: string | null;
  note?: string | null;
}) {
  await ensureConfiguredAdminAccounts();
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const couponCode = normalizeCouponCode(input.coupon);

  if (!email) {
    throw new Error("EMAIL_REQUIRED");
  }

  if (!name) {
    throw new Error("NAME_REQUIRED");
  }

  const db = await getDb();
  const approved = await db.one<ApprovedAccountRow>(
    `
      SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
      FROM approved_accounts
      WHERE lower(email) = ?
      LIMIT 1
    `,
    [email],
  );

  if (approved && isAccountActive(mapApprovedAccount(approved))) {
    throw new Error("ACCOUNT_ALREADY_APPROVED");
  }

  const pending = await db.one<SignupRequestRow>(
    `
      SELECT id, email, name, cohort, coupon, note, status, created_at, updated_at
      FROM signup_requests
      WHERE lower(email) = ? AND status = 'pending'
      LIMIT 1
    `,
    [email],
  );

  if (!couponCode) {
    if (pending) {
      throw new Error("SIGNUP_REQUEST_ALREADY_PENDING");
    }

    const request: SignupRequest = {
      id: randomUUID(),
      email,
      name,
      cohort: normalizeOptionalText(input.cohort) ?? undefined,
      coupon: undefined,
      note: normalizeOptionalText(input.note) ?? undefined,
      status: "pending",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.run(
      `
        INSERT INTO signup_requests (
          id, email, name, cohort, coupon, note, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        request.id,
        request.email,
        request.name,
        request.cohort ?? null,
        null,
        request.note ?? null,
        request.status,
        request.createdAt,
        request.updatedAt,
      ],
    );

    return request;
  }

  const now = nowIso();

  return db.transaction(async (tx) => {
    const coupon = await tx.one<CouponCodeRow>(
      `
        SELECT id, code, valid_days, max_uses, status, created_at, updated_at
        FROM coupon_codes
        WHERE code = ?
        LIMIT 1
      `,
      [couponCode],
    );

    if (!coupon || coupon.status !== "active") {
      throw new Error("COUPON_NOT_FOUND");
    }

    const redeemedRow = await tx.one<{ count: number | string }>(
      "SELECT COUNT(*) AS count FROM coupon_redemptions WHERE coupon_id = ?",
      [coupon.id],
    );
    const redeemedCount = Number(redeemedRow?.count ?? 0);

    if (redeemedCount >= Number(coupon.max_uses)) {
      throw new Error("COUPON_EXHAUSTED");
    }

    let approvedAccountId: string;
    const expiresAt = computeCouponExpiry(Number(coupon.valid_days));

    if (approved) {
      approvedAccountId = approved.id;
      await tx.run(
        `
          UPDATE approved_accounts
          SET name = ?, cohort = ?, status = 'approved', expires_at = ?, updated_at = ?
          WHERE id = ?
        `,
        [name, normalizeOptionalText(input.cohort), expiresAt, now, approved.id],
      );
    } else {
      approvedAccountId = randomUUID();
      await tx.run(
        `
          INSERT INTO approved_accounts (
            id, email, name, cohort, status, expires_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'approved', ?, ?, ?)
        `,
        [
          approvedAccountId,
          email,
          name,
          normalizeOptionalText(input.cohort),
          expiresAt,
          now,
          now,
        ],
      );
    }

    const signupRequestId = pending?.id ?? randomUUID();

    if (pending) {
      await tx.run(
        `
          UPDATE signup_requests
          SET name = ?, cohort = ?, coupon = ?, note = ?, status = 'approved', updated_at = ?
          WHERE id = ?
        `,
        [
          name,
          normalizeOptionalText(input.cohort),
          couponCode,
          normalizeOptionalText(input.note),
          now,
          signupRequestId,
        ],
      );
    } else {
      await tx.run(
        `
          INSERT INTO signup_requests (
            id, email, name, cohort, coupon, note, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)
        `,
        [
          signupRequestId,
          email,
          name,
          normalizeOptionalText(input.cohort),
          couponCode,
          normalizeOptionalText(input.note),
          now,
          now,
        ],
      );
    }

    await tx.run(
      `
        INSERT INTO coupon_redemptions (
          id, coupon_id, email, approved_account_id, signup_request_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [randomUUID(), coupon.id, email, approvedAccountId, signupRequestId, now],
    );

    const updated = await tx.one<SignupRequestRow>(
      `
        SELECT id, email, name, cohort, coupon, note, status, created_at, updated_at
        FROM signup_requests
        WHERE id = ?
        LIMIT 1
      `,
      [signupRequestId],
    );

    if (!updated) {
      throw new Error("UNKNOWN_ERROR");
    }

    return mapSignupRequest(updated);
  });
}

export async function findApprovedAccountsByEmails(emails: string[]) {
  await ensureConfiguredAdminAccounts();
  const normalizedEmails = Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)));

  if (normalizedEmails.length === 0) {
    return [];
  }

  const db = await getDb();
  const placeholders = normalizedEmails.map(() => "?").join(", ");
  const rows = await db.many<ApprovedAccountRow>(
    `
    SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
    FROM approved_accounts
    WHERE lower(email) IN (${placeholders})
  `,
    normalizedEmails,
  );

  return rows.map(mapApprovedAccount);
}

async function revokeActiveSessionsByEmail(email: string) {
  const db = await getDb();
  await db.run(
    `
    UPDATE creator_sessions
    SET status = 'revoked', updated_at = ?
    WHERE lower(email) = ? AND status = 'active'
  `,
    [nowIso(), normalizeEmail(email)],
  );
}

export async function createApprovedAccount(input: {
  email: string;
  name: string;
  cohort?: string | null;
  expiresAt?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (!email) {
    throw new Error("EMAIL_REQUIRED");
  }

  if (!name) {
    throw new Error("NAME_REQUIRED");
  }

  const db = await getDb();
  const existing = await db.one<{ id: string }>(
    `
    SELECT id
    FROM approved_accounts
    WHERE lower(email) = ?
    LIMIT 1
  `,
    [email],
  );

  if (existing) {
    throw new Error("ACCOUNT_ALREADY_EXISTS");
  }

  const account: ApprovedAccount = {
    id: randomUUID(),
    email,
    name,
    cohort: normalizeOptionalText(input.cohort) ?? undefined,
    status: "approved",
    expiresAt: normalizeExpiryInput(input.expiresAt),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.run(
    `
    INSERT INTO approved_accounts (
      id, email, name, cohort, status, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      account.id,
      account.email,
      account.name,
      account.cohort ?? null,
      account.status,
      account.expiresAt,
      account.createdAt,
      account.updatedAt,
    ],
  );

  return account;
}

export async function updateApprovedAccount(input: {
  accountId: string;
  name: string;
  cohort?: string | null;
  status: ApprovedAccount["status"];
  expiresAt?: string | null;
}) {
  const db = await getDb();
  const existing = await db.one<ApprovedAccountRow>(
    `
    SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
    FROM approved_accounts
    WHERE id = ?
    LIMIT 1
  `,
    [input.accountId],
  );

  if (!existing) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("NAME_REQUIRED");
  }

  const updatedAccount: ApprovedAccount = {
    ...mapApprovedAccount(existing),
    name,
    cohort: normalizeOptionalText(input.cohort) ?? undefined,
    status: input.status,
    expiresAt: normalizeExpiryInput(input.expiresAt),
    updatedAt: nowIso(),
  };

  await db.run(
    `
    UPDATE approved_accounts
    SET name = ?, cohort = ?, status = ?, expires_at = ?, updated_at = ?
    WHERE id = ?
  `,
    [
      updatedAccount.name,
      updatedAccount.cohort ?? null,
      updatedAccount.status,
      updatedAccount.expiresAt,
      updatedAccount.updatedAt,
      updatedAccount.id,
    ],
  );

  if (!isAccountActive(updatedAccount)) {
    await revokeActiveSessionsByEmail(updatedAccount.email);
  }

  return updatedAccount;
}

export async function deleteApprovedAccount(input: { accountId: string; actorEmail: string }) {
  await ensureConfiguredAdminAccounts();
  const db = await getDb();
  const existing = await db.one<ApprovedAccountRow>(
    `
    SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
    FROM approved_accounts
    WHERE id = ?
    LIMIT 1
  `,
    [input.accountId],
  );

  if (!existing) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  const normalizedTargetEmail = normalizeEmail(existing.email);
  const normalizedActorEmail = normalizeEmail(input.actorEmail);

  if (normalizedTargetEmail === normalizedActorEmail || getConfiguredAdminEmails().includes(normalizedTargetEmail)) {
    throw new Error("ACCOUNT_DELETE_FORBIDDEN");
  }

  const [landingCountRow, couponUsageRow] = await Promise.all([
    db.one<{ count: number | string }>(
      "SELECT COUNT(*) AS count FROM landings WHERE lower(owner_email) = ?",
      [normalizedTargetEmail],
    ),
    db.one<{ count: number | string }>(
      "SELECT COUNT(*) AS count FROM coupon_redemptions WHERE approved_account_id = ?",
      [input.accountId],
    ),
  ]);

  if (Number(landingCountRow?.count ?? 0) > 0) {
    throw new Error("ACCOUNT_HAS_LANDINGS");
  }

  if (Number(couponUsageRow?.count ?? 0) > 0) {
    throw new Error("ACCOUNT_HAS_COUPON_USAGE");
  }

  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM creator_sessions WHERE approved_account_id = ?", [input.accountId]);
    await tx.run("DELETE FROM approved_accounts WHERE id = ?", [input.accountId]);
  });

  return { ok: true as const };
}

export async function reviewSignupRequest(input: {
  requestId: string;
  action: "approve" | "reject";
}) {
  const db = await getDb();
  const existing = await db.one<SignupRequestRow>(
    `
      SELECT id, email, name, cohort, coupon, note, status, created_at, updated_at
      FROM signup_requests
      WHERE id = ?
      LIMIT 1
    `,
    [input.requestId],
  );

  if (!existing) {
    throw new Error("SIGNUP_REQUEST_NOT_FOUND");
  }

  if (
    (existing.status === "approved" && input.action === "approve") ||
    (existing.status === "rejected" && input.action === "reject")
  ) {
    throw new Error("SIGNUP_REQUEST_ALREADY_REVIEWED");
  }

  const updatedAt = nowIso();

  if (input.action === "approve") {
    await db.transaction(async (tx) => {
      const approved = await tx.one<ApprovedAccountRow>(
        `
          SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
          FROM approved_accounts
          WHERE lower(email) = ?
          LIMIT 1
        `,
        [existing.email.toLowerCase()],
      );

      if (approved) {
        await tx.run(
          `
            UPDATE approved_accounts
            SET name = ?, cohort = ?, status = 'approved', expires_at = NULL, updated_at = ?
            WHERE id = ?
          `,
          [existing.name, existing.cohort, updatedAt, approved.id],
        );
      } else {
        await tx.run(
          `
            INSERT INTO approved_accounts (
              id, email, name, cohort, status, expires_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'approved', NULL, ?, ?)
          `,
          [randomUUID(), existing.email, existing.name, existing.cohort, updatedAt, updatedAt],
        );
      }

      await tx.run(
        `
          UPDATE signup_requests
          SET status = 'approved', updated_at = ?
          WHERE id = ?
        `,
        [updatedAt, input.requestId],
      );
    });
  } else {
    await db.run(
      `
        UPDATE signup_requests
        SET status = 'rejected', updated_at = ?
        WHERE id = ?
      `,
      [updatedAt, input.requestId],
    );
  }

  const updated = await db.one<SignupRequestRow>(
    `
      SELECT id, email, name, cohort, coupon, note, status, created_at, updated_at
      FROM signup_requests
      WHERE id = ?
      LIMIT 1
    `,
    [input.requestId],
  );

  return updated ? mapSignupRequest(updated) : null;
}

export async function listSessions() {
  await ensureConfiguredAdminAccounts();
  const db = await getDb();
  const rows = await db.many<CreatorSessionRow>(
    `
      SELECT id, approved_account_id, email, token_version, expires_at, status,
             last_validated_at, created_at, updated_at
      FROM creator_sessions
      ORDER BY created_at DESC
    `,
  );

  return rows.map(mapCreatorSession);
}

export async function listActiveSessions() {
  await ensureConfiguredAdminAccounts();
  const db = await getDb();
  const rows = await db.many<CreatorSessionRow>(
    `
      SELECT s.id, s.approved_account_id, s.email, s.token_version, s.expires_at, s.status,
             s.last_validated_at, s.created_at, s.updated_at,
             a.name AS approved_name, a.cohort AS approved_cohort
      FROM creator_sessions s
      INNER JOIN approved_accounts a ON a.id = s.approved_account_id
      WHERE s.status = 'active'
      ORDER BY s.last_validated_at DESC, s.created_at DESC
    `,
  );

  return rows.map(mapAdminCreatorSession);
}

export async function findApprovedAccountByEmail(email: string) {
  await ensureConfiguredAdminAccounts();
  const normalized = normalizeEmail(email);
  const db = await getDb();
  const row = await db.one<ApprovedAccountRow>(
    `
      SELECT id, email, name, cohort, status, expires_at, created_at, updated_at
      FROM approved_accounts
      WHERE lower(email) = ?
      LIMIT 1
    `,
    [normalized],
  );

  if (!row) {
    return null;
  }

  const account = mapApprovedAccount(row);

  if (!isAccountActive(account)) {
    return null;
  }

  return account;
}

export async function createApprovedSession(input: { email: string }) {
  const account = await findApprovedAccountByEmail(input.email);

  if (!account) {
    return { ok: false as const, reason: "EMAIL_NOT_APPROVED" };
  }

  const db = await getDb();
  const timestamp = nowIso();
  const session: CreatorSession = {
    id: randomUUID(),
    approvedAccountId: account.id,
    email: account.email,
    tokenVersion: 1,
    expiresAt: computeExpiry(SESSION_VALIDITY_DAYS),
    status: "active",
    lastValidatedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.transaction(async (tx) => {
    await tx.run(
      `
      UPDATE creator_sessions
      SET status = 'revoked', updated_at = ?
      WHERE lower(email) = ? AND status = 'active'
    `,
      [timestamp, account.email.toLowerCase()],
    );

    await tx.run(
      `
      INSERT INTO creator_sessions (
        id, approved_account_id, email, token_version, expires_at, status,
        last_validated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        session.id,
        session.approvedAccountId,
        session.email,
        session.tokenVersion,
        session.expiresAt,
        session.status,
        session.lastValidatedAt,
        session.createdAt,
        session.updatedAt,
      ],
    );
  });

  const tokenPayload: AccessTokenPayload = {
    sessionId: session.id,
    email: session.email,
    tokenVersion: session.tokenVersion,
    expiresAt: session.expiresAt,
  };

  return {
    ok: true as const,
    token: createAccessToken(tokenPayload),
    session,
    account,
  };
}

export async function validateSessionToken(token: string) {
  const payload = verifyAccessToken(token);

  if (!payload) {
    return { ok: false as const, reason: "INVALID_TOKEN" };
  }

  const db = await getDb();
  const row = await db.one<CreatorSessionRow>(
    `
      SELECT s.id, s.approved_account_id, s.email, s.token_version, s.expires_at, s.status,
             s.last_validated_at, s.created_at, s.updated_at,
             a.status AS approved_status, a.expires_at AS approved_expires_at
      FROM creator_sessions s
      INNER JOIN approved_accounts a ON a.id = s.approved_account_id
      WHERE s.id = ?
      LIMIT 1
    `,
    [payload.sessionId],
  );

  if (!row) {
    return { ok: false as const, reason: "SESSION_NOT_FOUND" };
  }

  const session = mapCreatorSession(row);
  const accountSnapshot = {
    status: row.approved_status ?? "blocked",
    expiresAt: row.approved_expires_at ?? null,
  } satisfies Pick<ApprovedAccount, "status" | "expiresAt">;

  if (session.status !== "active") {
    return { ok: false as const, reason: "SESSION_INACTIVE" };
  }

  if (!isAccountActive(accountSnapshot)) {
    await revokeActiveSessionsByEmail(session.email);
    return { ok: false as const, reason: "SESSION_INACTIVE" };
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await db.run(
      `
      UPDATE creator_sessions
      SET status = 'expired', updated_at = ?
      WHERE id = ?
    `,
      [nowIso(), session.id],
    );

    return { ok: false as const, reason: "SESSION_INACTIVE" };
  }

  if (session.tokenVersion !== payload.tokenVersion) {
    return { ok: false as const, reason: "TOKEN_VERSION_MISMATCH" };
  }

  const validatedAt = nowIso();
  await db.run(
    `
    UPDATE creator_sessions
    SET last_validated_at = ?, updated_at = ?
    WHERE id = ?
  `,
    [validatedAt, validatedAt, session.id],
  );

  return {
    ok: true as const,
    session: {
      ...session,
      lastValidatedAt: validatedAt,
      updatedAt: validatedAt,
    },
    payload,
  };
}

export async function revokeSessionByToken(token: string) {
  const payload = verifyAccessToken(token);

  if (!payload) {
    return { ok: false as const, reason: "INVALID_TOKEN" };
  }

  const db = await getDb();
  const { changes } = await db.run(
    `
      UPDATE creator_sessions
      SET status = 'revoked', updated_at = ?
      WHERE id = ?
    `,
    [nowIso(), payload.sessionId],
  );

  if (changes === 0) {
    return { ok: false as const, reason: "SESSION_NOT_FOUND" };
  }

  return { ok: true as const };
}

export async function revokeSessionById(sessionId: string) {
  const db = await getDb();
  const { changes } = await db.run(
    `
      UPDATE creator_sessions
      SET status = 'revoked', updated_at = ?
      WHERE id = ?
    `,
    [nowIso(), sessionId],
  );

  if (changes === 0) {
    throw new Error("SESSION_NOT_FOUND");
  }

  return { ok: true as const };
}
