import { NextResponse } from "next/server";

import type { LandingCreateInput, LandingFormField, LandingImage } from "@/domain/types";
import { requireCreatorAuth } from "@/server/creator-auth";
import { createLanding, listLandingsByOwner } from "@/server/landing-service";

function normalizeImages(images: LandingImage[]) {
  return images.map((image, index) => ({
    ...image,
    sortOrder: image.sortOrder || index + 1,
  }));
}

function normalizeFormFields(fields: LandingFormField[]) {
  return fields.map((field, index) => ({
    ...field,
    sortOrder: field.sortOrder || index + 1,
  }));
}

export async function GET() {
  const auth = await requireCreatorAuth();
  const landings = await listLandingsByOwner(auth.session.email);
  return NextResponse.json({ landings });
}

export async function POST(request: Request) {
  try {
    const auth = await requireCreatorAuth();
    const body = (await request.json()) as LandingCreateInput;

    if (!body.title || !body.publicSlug || !body.type) {
      return NextResponse.json(
        { message: "title, publicSlug, and type are required." },
        { status: 400 },
      );
    }

    if (body.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
      return NextResponse.json({ message: "Owner email mismatch." }, { status: 403 });
    }

    const landing = await createLanding({
      ...body,
      images: normalizeImages(body.images || []),
      buttons: body.buttons || [],
      formFields: normalizeFormFields(body.formFields || []),
      htmlSource: body.htmlSource ?? null,
    });

    return NextResponse.json({ landing }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while creating landing.";
    const status = message === "PUBLIC_SLUG_ALREADY_EXISTS" ? 409 : 401;
    return NextResponse.json({ message }, { status });
  }
}
