import { cookies, headers } from "next/headers";

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
