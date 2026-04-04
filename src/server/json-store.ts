import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseDir = path.join(process.cwd(), "data");

async function ensureBaseDir() {
  await mkdir(baseDir, { recursive: true });
}

export async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  await ensureBaseDir();
  const target = path.join(baseDir, fileName);

  try {
    const raw = await readFile(target, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(fileName: string, value: T) {
  await ensureBaseDir();
  const target = path.join(baseDir, fileName);
  await writeFile(target, JSON.stringify(value, null, 2), "utf8");
}
