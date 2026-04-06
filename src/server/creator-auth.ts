import { cookies, headers } from "next/headers";

import { verifyAccessToken } from "@/lib/token";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/access-service";

export async function requireCreatorAuth() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const authHeader = headerStore.get("authorization");
  const fallbackToken = headerStore.get("x-golanding-token");
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const token =
    authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : fallbackToken ?? cookieToken;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const validation = await validateSessionToken(token);

  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  return validation;
}

export async function requireCreatorAuthSnapshot() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const authHeader = headerStore.get("authorization");
  const fallbackToken = headerStore.get("x-golanding-token");
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const token =
    authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : fallbackToken ?? cookieToken;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    ok: true as const,
    session: {
      id: payload.sessionId,
      email: payload.email,
      expiresAt: payload.expiresAt,
    },
  };
}
