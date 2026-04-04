import { createHmac, timingSafeEqual } from "node:crypto";

import type { AccessTokenPayload } from "@/domain/types";

const ACCESS_SECRET =
  process.env.GOLANDING_ACCESS_SECRET ?? "golanding-dev-secret-change-me";

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(input: string) {
  return createHmac("sha256", ACCESS_SECRET).update(input).digest("base64url");
}

export function createAccessToken(payload: AccessTokenPayload) {
  const header = encode(JSON.stringify({ alg: "HS256", typ: "GOLANDING" }));
  const body = encode(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    return null;
  }

  const expectedSignature = sign(`${header}.${body}`);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(body)) as AccessTokenPayload;
    if (new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
