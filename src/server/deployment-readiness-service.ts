import type {
  DeploymentCheckStatus,
  DeploymentReadiness,
  DeploymentReadinessCheck,
} from "@/domain/types";
import { getCurrentDbProvider } from "@/server/db";
import { getCurrentStorageProvider } from "@/server/storage-service";

function pushCheck(
  checks: DeploymentReadinessCheck[],
  id: string,
  label: string,
  status: DeploymentCheckStatus,
  detail: string,
) {
  checks.push({ id, label, status, detail });
}

function hasNonPlaceholderValue(value: string | undefined, placeholders: string[]) {
  if (!value?.trim()) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return !placeholders.some((placeholder) => normalized.includes(placeholder));
}

export async function getDeploymentReadiness(input: {
  approvedAccountCount: number;
}): Promise<DeploymentReadiness> {
  const checks: DeploymentReadinessCheck[] = [];
  const environment = process.env.NODE_ENV ?? "development";
  const dbProvider = getCurrentDbProvider();
  const storageProvider = getCurrentStorageProvider();
  const accessSecret = process.env.GOLANDING_ACCESS_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmails = process.env.GOLANDING_ADMIN_EMAILS;
  const storagePublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const s3Region = process.env.S3_REGION;
  const s3Bucket = process.env.S3_BUCKET;
  const s3AccessKey = process.env.S3_ACCESS_KEY_ID;
  const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY;

  pushCheck(
    checks,
    "access-secret",
    "Access secret",
    hasNonPlaceholderValue(accessSecret, ["replace-with-random-secret", "replace-with-long-random-secret"])
      ? "pass"
      : "fail",
    hasNonPlaceholderValue(accessSecret, ["replace-with-random-secret", "replace-with-long-random-secret"])
      ? "Access token signing secret is configured."
      : "Set a long random GOLANDING_ACCESS_SECRET before production deployment.",
  );

  pushCheck(
    checks,
    "admin-emails",
    "Admin emails",
    adminEmails?.trim() ? "pass" : "fail",
    adminEmails?.trim()
      ? `Configured admin emails: ${adminEmails}`
      : "Set GOLANDING_ADMIN_EMAILS so at least one operator can access admin controls.",
  );

  pushCheck(
    checks,
    "approved-accounts",
    "Approved accounts",
    input.approvedAccountCount > 0 ? "pass" : "warn",
    input.approvedAccountCount > 0
      ? `${input.approvedAccountCount} approved creator account(s) available.`
      : "No approved creator accounts exist yet. Add at least one before launch.",
  );

  pushCheck(
    checks,
    "db-provider",
    "Database provider",
    dbProvider === "postgres" ? "pass" : environment === "production" ? "fail" : "warn",
    dbProvider === "postgres"
      ? "PostgreSQL is selected for runtime storage."
      : environment === "production"
        ? "Production should not run on SQLite. Switch GOLANDING_DB_PROVIDER to postgres."
        : "SQLite is fine for local development, but production should use PostgreSQL.",
  );

  pushCheck(
    checks,
    "database-url",
    "Database URL",
    dbProvider === "postgres" ? (databaseUrl?.trim() ? "pass" : "fail") : "warn",
    dbProvider === "postgres"
      ? databaseUrl?.trim()
        ? "DATABASE_URL is configured."
        : "DATABASE_URL is required when GOLANDING_DB_PROVIDER=postgres."
      : "DATABASE_URL is not required while SQLite is selected.",
  );

  pushCheck(
    checks,
    "storage-provider",
    "Storage provider",
    storageProvider === "s3" ? "pass" : environment === "production" ? "warn" : "pass",
    storageProvider === "s3"
      ? "S3-compatible object storage is selected."
      : environment === "production"
        ? "Local uploads work, but production should prefer S3-compatible storage."
        : "Local file storage is acceptable for development.",
  );

  const s3Configured =
    Boolean(s3Region?.trim()) &&
    Boolean(s3Bucket?.trim()) &&
    Boolean(storagePublicBaseUrl?.trim()) &&
    Boolean(s3AccessKey?.trim()) &&
    Boolean(s3SecretKey?.trim());

  pushCheck(
    checks,
    "storage-config",
    "Storage configuration",
    storageProvider === "s3" ? (s3Configured ? "pass" : "fail") : "warn",
    storageProvider === "s3"
      ? s3Configured
        ? "S3 bucket, region, public base URL, and credentials are configured."
        : "When using S3 storage, configure S3_REGION, S3_BUCKET, S3_PUBLIC_BASE_URL, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."
      : "S3 variables are optional while local uploads are selected.",
  );

  const overallStatus: DeploymentCheckStatus = checks.some((check) => check.status === "fail")
    ? "fail"
    : checks.some((check) => check.status === "warn")
      ? "warn"
      : "pass";

  return {
    environment,
    dbProvider,
    storageProvider,
    overallStatus,
    checks,
  };
}
