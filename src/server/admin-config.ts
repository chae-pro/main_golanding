function getFallbackAdminEmails() {
  if (process.env.NODE_ENV !== "production") {
    return ["classdemo@example.com"];
  }

  return [];
}

export function getConfiguredAdminEmails() {
  const configured = process.env.GOLANDING_ADMIN_EMAILS?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return Array.from(new Set(configured));
  }

  return getFallbackAdminEmails();
}

export function isConfiguredAdminEmail(email: string) {
  return getConfiguredAdminEmails().includes(email.trim().toLowerCase());
}

export function buildAdminDisplayName(email: string) {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (!localPart) {
    return "Platform Admin";
  }

  return localPart
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
