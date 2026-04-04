import { cookies } from "next/headers";

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
