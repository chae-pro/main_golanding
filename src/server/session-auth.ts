import { cookies } from "next/headers";

import { verifyAccessToken } from "@/lib/token";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/access-service";

export async function getCurrentCreatorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const validation = await validateSessionToken(token);
  return validation.ok ? validation : null;
}

export async function getCurrentCreatorSessionSnapshot() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return null;
  }

  return {
    session: {
      id: payload.sessionId,
      email: payload.email,
      expiresAt: payload.expiresAt,
    },
  };
}
