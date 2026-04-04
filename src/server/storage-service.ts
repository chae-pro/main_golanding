import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type StorageProvider = "local" | "s3";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

type UploadResult = {
  src: string;
  key: string;
  provider: StorageProvider;
};

type StorageGlobal = typeof globalThis & {
  __golandingS3Client?: S3Client;
};

function getStorageProvider(): StorageProvider {
  const explicit = process.env.GOLANDING_STORAGE_PROVIDER?.trim().toLowerCase();

  if (explicit === "s3") {
    return "s3";
  }

  return "local";
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function sanitizeExtension(fileName: string, mimeType: string) {
  const byName = path.extname(fileName).toLowerCase();

  if (ALLOWED_EXTENSIONS.includes(byName)) {
    return byName;
  }

  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  if (mimeType === "image/gif") {
    return ".gif";
  }

  return null;
}

function assertValidImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("이미지는 10MB 이하만 업로드할 수 있습니다.");
  }

  const extension = sanitizeExtension(file.name, file.type);

  if (!extension) {
    throw new Error("지원하지 않는 이미지 형식입니다. png, jpg, webp, gif만 가능합니다.");
  }

  return extension;
}

function buildObjectKey(extension: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `landing-images/${year}/${month}/${randomUUID()}${extension}`;
}

async function uploadToLocal(file: File, key: string): Promise<UploadResult> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", path.dirname(key));
  const targetPath = path.join(process.cwd(), "public", "uploads", key);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(targetPath, bytes);

  return {
    src: `/uploads/${key.replace(/\\/g, "/")}`,
    key,
    provider: "local",
  };
}

function getS3Client() {
  const globalStorage = globalThis as StorageGlobal;

  if (!globalStorage.__golandingS3Client) {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const region = process.env.S3_REGION;

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error("S3 업로드를 사용하려면 S3 접속 정보가 필요합니다.");
    }

    globalStorage.__golandingS3Client = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return globalStorage.__golandingS3Client;
}

async function uploadToS3(file: File, key: string): Promise<UploadResult> {
  const bucket = process.env.S3_BUCKET;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  if (!bucket || !publicBaseUrl) {
    throw new Error("S3 업로드를 사용하려면 S3_BUCKET과 S3_PUBLIC_BASE_URL이 필요합니다.");
  }

  const client = getS3Client();
  const bytes = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    src: `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
    key,
    provider: "s3",
  };
}

export async function saveUploadedImage(file: File): Promise<UploadResult> {
  const extension = assertValidImage(file);
  const key = buildObjectKey(extension);

  if (getStorageProvider() === "s3") {
    return uploadToS3(file, key);
  }

  if (isProductionRuntime()) {
    throw new Error(
      "현재 운영 환경에서는 로컬 업로드를 사용할 수 없습니다. Vercel에서는 S3 호환 스토리지를 연결해야 합니다.",
    );
  }

  return uploadToLocal(file, key);
}

export function getCurrentStorageProvider() {
  return getStorageProvider();
}
