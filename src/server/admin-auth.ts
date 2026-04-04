import { getCurrentCreatorSession } from "@/server/session-auth";
import { getConfiguredAdminEmails, isConfiguredAdminEmail } from "@/server/admin-config";

export function isAdminEmail(email: string) {
  return isConfiguredAdminEmail(email);
}

export function listAdminEmails() {
  return getConfiguredAdminEmails();
}

export async function requireAdminSession() {
  const auth = await getCurrentCreatorSession();

  if (!auth) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isAdminEmail(auth.session.email)) {
    throw new Error("FORBIDDEN");
  }

  return auth;
}
