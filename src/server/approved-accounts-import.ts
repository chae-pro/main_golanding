import {
  createApprovedAccount,
  findApprovedAccountsByEmails,
  normalizeExpiryInput,
} from "@/server/access-service";

export type ApprovedAccountsImportResult = {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  created: Array<{ email: string; name: string }>;
  skipped: Array<{ rowNumber: number; email: string; reason: string }>;
  errors: Array<{ rowNumber: number; raw: string; reason: string }>;
};

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeaderName(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseCsvRows(csvText: string) {
  const normalized = csvText.replace(/^\uFEFF/, "");
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("CSV_EMPTY");
  }

  const firstRow = splitCsvLine(lines[0]).map(normalizeHeaderName);
  const hasHeader = firstRow.includes("email");
  const rows = hasHeader ? lines.slice(1) : lines;
  const headerMap = hasHeader ? firstRow : ["email", "name", "cohort", "expiresat"];

  return rows.map((raw, index) => {
    const cells = splitCsvLine(raw);
    const lookup = new Map<string, string>();

    headerMap.forEach((header, cellIndex) => {
      lookup.set(header, cells[cellIndex] ?? "");
    });

    return {
      rowNumber: hasHeader ? index + 2 : index + 1,
      raw,
      email: lookup.get("email") ?? "",
      name: lookup.get("name") ?? "",
      cohort: lookup.get("cohort") ?? "",
      expiresAt:
        lookup.get("expiresat") ??
        lookup.get("expires") ??
        lookup.get("expireat") ??
        lookup.get("expiry") ??
        "",
    };
  });
}

export async function importApprovedAccountsFromCsv(
  csvText: string,
): Promise<ApprovedAccountsImportResult> {
  const parsedRows = parseCsvRows(csvText);
  const result: ApprovedAccountsImportResult = {
    totalRows: parsedRows.length,
    createdCount: 0,
    skippedCount: 0,
    errorCount: 0,
    created: [],
    skipped: [],
    errors: [],
  };

  const seenInFile = new Set<string>();
  const normalizedEmails = parsedRows
    .map((row) => row.email.trim().toLowerCase())
    .filter(Boolean);
  const existingAccounts = await findApprovedAccountsByEmails(normalizedEmails);
  const existingEmailSet = new Set(existingAccounts.map((account) => account.email.toLowerCase()));

  for (const row of parsedRows) {
    const email = row.email.trim().toLowerCase();
    const name = row.name.trim();

    if (!email) {
      result.errors.push({
        rowNumber: row.rowNumber,
        raw: row.raw,
        reason: "Email is required.",
      });
      continue;
    }

    if (!name) {
      result.errors.push({
        rowNumber: row.rowNumber,
        raw: row.raw,
        reason: "Name is required.",
      });
      continue;
    }

    if (seenInFile.has(email)) {
      result.skipped.push({
        rowNumber: row.rowNumber,
        email,
        reason: "Duplicate email in the CSV file.",
      });
      continue;
    }

    if (existingEmailSet.has(email)) {
      result.skipped.push({
        rowNumber: row.rowNumber,
        email,
        reason: "Email already exists.",
      });
      seenInFile.add(email);
      continue;
    }

    try {
      const expiresAt = normalizeExpiryInput(row.expiresAt);
      const account = await createApprovedAccount({
        email,
        name,
        cohort: row.cohort,
        expiresAt,
      });

      seenInFile.add(email);
      result.created.push({
        email: account.email,
        name: account.name,
      });
    } catch (error) {
      result.errors.push({
        rowNumber: row.rowNumber,
        raw: row.raw,
        reason: error instanceof Error ? error.message : "Unknown import error.",
      });
    }
  }

  result.createdCount = result.created.length;
  result.skippedCount = result.skipped.length;
  result.errorCount = result.errors.length;

  return result;
}
