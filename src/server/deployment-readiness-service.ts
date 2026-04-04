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
    "접근 비밀키",
    hasNonPlaceholderValue(accessSecret, ["replace-with-random-secret", "replace-with-long-random-secret"])
      ? "pass"
      : "fail",
    hasNonPlaceholderValue(accessSecret, ["replace-with-random-secret", "replace-with-long-random-secret"])
      ? "접근 토큰 서명용 비밀키가 설정되어 있습니다."
      : "운영 배포 전 GOLANDING_ACCESS_SECRET에 충분히 긴 랜덤 값을 설정하세요.",
  );

  pushCheck(
    checks,
    "admin-emails",
    "관리자 이메일",
    adminEmails?.trim() ? "pass" : "fail",
    adminEmails?.trim()
      ? `설정된 관리자 이메일: ${adminEmails}`
      : "GOLANDING_ADMIN_EMAILS를 설정해 최소 1명의 운영자가 관리자 기능에 접근할 수 있어야 합니다.",
  );

  pushCheck(
    checks,
    "approved-accounts",
    "승인 계정",
    input.approvedAccountCount > 0 ? "pass" : "warn",
    input.approvedAccountCount > 0
      ? `사용 가능한 승인 제작자 계정이 ${input.approvedAccountCount}개 있습니다.`
      : "아직 승인된 제작자 계정이 없습니다. 오픈 전에 최소 1개 이상 추가하세요.",
  );

  pushCheck(
    checks,
    "db-provider",
    "데이터베이스 방식",
    dbProvider === "postgres" ? "pass" : environment === "production" ? "fail" : "warn",
    dbProvider === "postgres"
      ? "운영 저장소로 PostgreSQL이 선택되어 있습니다."
      : environment === "production"
        ? "운영 환경에서 SQLite는 적합하지 않습니다. GOLANDING_DB_PROVIDER를 postgres로 변경하세요."
        : "로컬 개발에서는 SQLite를 써도 되지만, 운영 환경은 PostgreSQL을 권장합니다.",
  );

  pushCheck(
    checks,
    "database-url",
    "데이터베이스 연결 문자열",
    dbProvider === "postgres" ? (databaseUrl?.trim() ? "pass" : "fail") : "warn",
    dbProvider === "postgres"
      ? databaseUrl?.trim()
        ? "DATABASE_URL이 설정되어 있습니다."
        : "GOLANDING_DB_PROVIDER=postgres 인 경우 DATABASE_URL이 반드시 필요합니다."
      : "SQLite를 사용할 때는 DATABASE_URL이 필수가 아닙니다.",
  );

  pushCheck(
    checks,
    "storage-provider",
    "스토리지 방식",
    storageProvider === "s3" ? "pass" : environment === "production" ? "warn" : "pass",
    storageProvider === "s3"
      ? "S3 호환 오브젝트 스토리지가 선택되어 있습니다."
      : environment === "production"
        ? "로컬 업로드도 동작은 하지만, 운영 환경에서는 S3 호환 스토리지를 권장합니다."
        : "개발 환경에서는 로컬 파일 저장을 사용해도 됩니다.",
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
    "스토리지 설정",
    storageProvider === "s3" ? (s3Configured ? "pass" : "fail") : "warn",
    storageProvider === "s3"
      ? s3Configured
        ? "S3 버킷, 리전, 공개 URL, 인증 정보가 모두 설정되어 있습니다."
        : "S3 스토리지를 사용할 경우 S3_REGION, S3_BUCKET, S3_PUBLIC_BASE_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY를 설정해야 합니다."
      : "로컬 업로드를 사용할 때는 S3 관련 환경변수가 선택 사항입니다.",
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
