import { randomUUID } from "node:crypto";

import type {
  Landing,
  LandingButton,
  LandingCreateInput,
  LandingFormField,
  LandingImage,
  LandingMetrics,
  LandingUpdateInput,
} from "@/domain/types";
import { getDb } from "@/server/db";

const EMPTY_METRICS: LandingMetrics = {
  visitorCount: 0,
  totalClickCount: 0,
  ctaClickCount: 0,
  formSubmissionCount: 0,
  avgScrollDepth: 0,
  avgDwellSeconds: 0,
  scrollCompletionRate: 0,
  validDwellSessionCount: 0,
  excludedDwellSessionCount: 0,
  dwellSections: Array.from({ length: 20 }, () => 0),
  topSections: [],
  weakSections: [],
};

type LandingRow = {
  id: string;
  owner_email: string;
  type: Landing["type"];
  title: string;
  public_slug: string;
  status: Landing["status"];
  description: string | null;
  primary_color: string;
  text_color: string;
  surface_color: string;
  radius: number;
  html_source: string | null;
  created_at: string;
  updated_at: string;
};

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

async function isPublicSlugTaken(publicSlug: string) {
  const db = await getDb();
  const exists = await db.one<{ id: string }>(
    "SELECT id FROM landings WHERE public_slug = ? LIMIT 1",
    [publicSlug],
  );

  return Boolean(exists);
}

async function ensureUniquePublicSlug(baseSlug: string) {
  let candidate = `${baseSlug}-copy`;
  let index = 2;

  while (await isPublicSlugTaken(candidate)) {
    candidate = `${baseSlug}-copy-${index}`;
    index += 1;
  }

  return candidate;
}

async function getLandingImages(landingId: string): Promise<LandingImage[]> {
  const db = await getDb();
  const rows = await db.many<{
    id: string;
    sort_order: number;
    src: string;
    alt: string | null;
  }>(
    `
      SELECT id, sort_order, src, alt
      FROM landing_images
      WHERE landing_id = ?
      ORDER BY sort_order ASC
    `,
    [landingId],
  );

  return rows.map((row) => ({
    id: row.id,
    sortOrder: row.sort_order,
    src: row.src,
    alt: row.alt ?? undefined,
  }));
}

async function getLandingButtons(landingId: string): Promise<LandingButton[]> {
  const db = await getDb();
  const rows = await db.many<{
    id: string;
    label: string;
    href: string;
    width_ratio: number;
    sort_order: number;
  }>(
    `
      SELECT id, label, href, width_ratio, sort_order
      FROM landing_buttons
      WHERE landing_id = ?
      ORDER BY sort_order ASC
    `,
    [landingId],
  );

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href,
    widthRatio: row.width_ratio,
    sortOrder: row.sort_order,
  }));
}

async function getLandingFormFields(landingId: string): Promise<LandingFormField[]> {
  const db = await getDb();
  const rows = await db.many<{
    id: string;
    field_key: LandingFormField["fieldKey"];
    label: string;
    placeholder: string | null;
    required: number;
    sort_order: number;
  }>(
    `
      SELECT id, field_key, label, placeholder, required, sort_order
      FROM landing_form_fields
      WHERE landing_id = ?
      ORDER BY sort_order ASC
    `,
    [landingId],
  );

  return rows.map((row) => ({
    id: row.id,
    fieldKey: row.field_key,
    label: row.label,
    placeholder: row.placeholder ?? undefined,
    required: Boolean(row.required),
    sortOrder: row.sort_order,
  }));
}

async function mapLanding(row: LandingRow): Promise<Landing> {
  const [images, buttons, formFields] = await Promise.all([
    getLandingImages(row.id),
    getLandingButtons(row.id),
    getLandingFormFields(row.id),
  ]);

  return {
    id: row.id,
    ownerEmail: row.owner_email,
    type: row.type,
    title: row.title,
    publicSlug: row.public_slug,
    status: row.status,
    description: row.description ?? undefined,
    theme: {
      primaryColor: row.primary_color,
      textColor: row.text_color,
      surfaceColor: row.surface_color,
      radius: row.radius,
    },
    images,
    buttons,
    formFields,
    htmlSource: row.html_source ? { htmlSource: row.html_source } : null,
    metrics: EMPTY_METRICS,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLandings() {
  const db = await getDb();
  const rows = await db.many<LandingRow>(
    `
      SELECT id, owner_email, type, title, public_slug, status, description,
             primary_color, text_color, surface_color, radius, html_source,
             created_at, updated_at
      FROM landings
      ORDER BY created_at DESC
    `,
  );

  return Promise.all(rows.map(mapLanding));
}

export async function listLandingsByOwner(ownerEmail: string) {
  const db = await getDb();
  const rows = await db.many<LandingRow>(
    `
      SELECT id, owner_email, type, title, public_slug, status, description,
             primary_color, text_color, surface_color, radius, html_source,
             created_at, updated_at
      FROM landings
      WHERE lower(owner_email) = ?
      ORDER BY created_at DESC
    `,
    [ownerEmail.toLowerCase()],
  );

  return Promise.all(rows.map(mapLanding));
}

export async function getLandingById(id: string) {
  const db = await getDb();
  const row = await db.one<LandingRow>(
    `
      SELECT id, owner_email, type, title, public_slug, status, description,
             primary_color, text_color, surface_color, radius, html_source,
             created_at, updated_at
      FROM landings
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return row ? mapLanding(row) : null;
}

export async function getLandingByPublicSlug(publicSlug: string) {
  const db = await getDb();
  const row = await db.one<LandingRow>(
    `
      SELECT id, owner_email, type, title, public_slug, status, description,
             primary_color, text_color, surface_color, radius, html_source,
             created_at, updated_at
      FROM landings
      WHERE public_slug = ?
      LIMIT 1
    `,
    [publicSlug],
  );

  return row ? mapLanding(row) : null;
}

export async function createLanding(input: LandingCreateInput) {
  const now = new Date().toISOString();
  if (await isPublicSlugTaken(input.publicSlug)) {
    throw new Error("PUBLIC_SLUG_ALREADY_EXISTS");
  }

  const db = await getDb();

  const landingId = randomUUID();
  const images = sortByOrder(input.images);
  const buttons = sortByOrder(input.buttons);
  const fields = sortByOrder(input.formFields);

  await db.transaction(async (tx) => {
    await tx.run(
      `
      INSERT INTO landings (
        id, owner_email, type, title, public_slug, status, description,
        primary_color, text_color, surface_color, radius, html_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        landingId,
        input.ownerEmail,
        input.type,
        input.title,
        input.publicSlug,
        "draft",
        input.description ?? null,
        input.theme.primaryColor,
        input.theme.textColor,
        input.theme.surfaceColor,
        input.theme.radius,
        input.htmlSource?.htmlSource ?? null,
        now,
        now,
      ],
    );

    for (const image of images) {
      await tx.run(
        "INSERT INTO landing_images (id, landing_id, sort_order, src, alt) VALUES (?, ?, ?, ?, ?)",
        [image.id, landingId, image.sortOrder, image.src, image.alt ?? null],
      );
    }

    for (const button of buttons) {
      await tx.run(
        "INSERT INTO landing_buttons (id, landing_id, label, href, width_ratio, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        [
          button.id,
          landingId,
          button.label,
          button.href,
          button.widthRatio,
          button.sortOrder,
        ],
      );
    }

    for (const field of fields) {
      await tx.run(
        "INSERT INTO landing_form_fields (id, landing_id, field_key, label, placeholder, required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          field.id,
          landingId,
          field.fieldKey,
          field.label,
          field.placeholder ?? null,
          field.required ? 1 : 0,
          field.sortOrder,
        ],
      );
    }
  });

  return getLandingById(landingId) as Promise<Landing>;
}

export async function duplicateLanding(input: { landingId: string; ownerEmail: string }) {
  const source = await getLandingById(input.landingId);

  if (!source) {
    throw new Error("LANDING_NOT_FOUND");
  }

  if (source.ownerEmail.toLowerCase() !== input.ownerEmail.toLowerCase()) {
    throw new Error("FORBIDDEN");
  }

  const duplicated = await createLanding({
    ownerEmail: input.ownerEmail,
    type: source.type,
    title: `${source.title} 복사본`,
    publicSlug: await ensureUniquePublicSlug(source.publicSlug),
    description: source.description,
    theme: source.theme,
    images: source.images.map((image) => ({
      ...image,
      id: randomUUID(),
    })),
    buttons: source.buttons.map((button) => ({
      ...button,
      id: randomUUID(),
    })),
    formFields: source.formFields.map((field) => ({
      ...field,
      id: randomUUID(),
    })),
    htmlSource: source.htmlSource,
  });

  return updateLandingStatus({
    landingId: duplicated.id,
    ownerEmail: input.ownerEmail,
    status: "archived",
  });
}

export async function updateLandingStatus(input: {
  landingId: string;
  ownerEmail: string;
  status: Landing["status"];
}) {
  const db = await getDb();
  const row = await db.one<{ owner_email: string }>(
    "SELECT owner_email FROM landings WHERE id = ? LIMIT 1",
    [input.landingId],
  );

  if (!row) {
    throw new Error("LANDING_NOT_FOUND");
  }

  if (row.owner_email.toLowerCase() !== input.ownerEmail.toLowerCase()) {
    throw new Error("FORBIDDEN");
  }

  await db.run(
    `
    UPDATE landings
    SET status = ?, updated_at = ?
    WHERE id = ?
  `,
    [input.status, new Date().toISOString(), input.landingId],
  );

  return getLandingById(input.landingId) as Promise<Landing>;
}

export async function updateLanding(input: LandingUpdateInput) {
  const db = await getDb();
  const existing = await db.one<
    | {
        owner_email: string;
        status: Landing["status"];
        created_at: string;
      }
    | undefined
  >("SELECT owner_email, status, created_at FROM landings WHERE id = ? LIMIT 1", [
    input.landingId,
  ]);

  if (!existing) {
    throw new Error("LANDING_NOT_FOUND");
  }

  if (existing.owner_email.toLowerCase() !== input.ownerEmail.toLowerCase()) {
    throw new Error("FORBIDDEN");
  }

  const updatedAt = new Date().toISOString();
  const images = sortByOrder(input.images);
  const buttons = sortByOrder(input.buttons);
  const fields = sortByOrder(input.formFields);

  await db.transaction(async (tx) => {
    await tx.run(
      `
      UPDATE landings
      SET type = ?, title = ?, public_slug = ?, description = ?,
          primary_color = ?, text_color = ?, surface_color = ?, radius = ?,
          html_source = ?, updated_at = ?
      WHERE id = ?
    `,
      [
        input.type,
        input.title,
        input.publicSlug,
        input.description ?? null,
        input.theme.primaryColor,
        input.theme.textColor,
        input.theme.surfaceColor,
        input.theme.radius,
        input.htmlSource?.htmlSource ?? null,
        updatedAt,
        input.landingId,
      ],
    );

    await tx.run("DELETE FROM landing_images WHERE landing_id = ?", [input.landingId]);
    await tx.run("DELETE FROM landing_buttons WHERE landing_id = ?", [input.landingId]);
    await tx.run("DELETE FROM landing_form_fields WHERE landing_id = ?", [input.landingId]);

    for (const image of images) {
      await tx.run(
        "INSERT INTO landing_images (id, landing_id, sort_order, src, alt) VALUES (?, ?, ?, ?, ?)",
        [image.id, input.landingId, image.sortOrder, image.src, image.alt ?? null],
      );
    }

    for (const button of buttons) {
      await tx.run(
        "INSERT INTO landing_buttons (id, landing_id, label, href, width_ratio, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        [
          button.id,
          input.landingId,
          button.label,
          button.href,
          button.widthRatio,
          button.sortOrder,
        ],
      );
    }

    for (const field of fields) {
      await tx.run(
        "INSERT INTO landing_form_fields (id, landing_id, field_key, label, placeholder, required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          field.id,
          input.landingId,
          field.fieldKey,
          field.label,
          field.placeholder ?? null,
          field.required ? 1 : 0,
          field.sortOrder,
        ],
      );
    }
  });

  return getLandingById(input.landingId) as Promise<Landing>;
}
