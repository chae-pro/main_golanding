import { NextResponse } from "next/server";

import type { LandingCreateInput, LandingFormField, LandingImage } from "@/domain/types";
import { requireCreatorAuth } from "@/server/creator-auth";
import { getLandingById, updateLanding, updateLandingStatus } from "@/server/landing-service";

type RouteContext = {
  params: Promise<{ landingId: string }>;
};

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

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireCreatorAuth();
  const { landingId } = await context.params;
  const landing = await getLandingById(landingId);

  if (!landing) {
    return NextResponse.json({ message: "Landing not found." }, { status: 404 });
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ landing });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireCreatorAuth();
    const { landingId } = await context.params;
    const body = (await request.json()) as {
      status?: "draft" | "published" | "archived";
    };

    if (!body.status) {
      return NextResponse.json({ message: "status is required." }, { status: 400 });
    }

    const landing = await updateLandingStatus({
      landingId,
      ownerEmail: auth.session.email,
      status: body.status,
    });

    return NextResponse.json({ landing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status update failed.";
    const status =
      message === "LANDING_NOT_FOUND" ? 404 : message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ message }, { status });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireCreatorAuth();
    const { landingId } = await context.params;
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

    const landing = await updateLanding({
      landingId,
      ...body,
      images: normalizeImages(body.images || []),
      buttons: body.buttons || [],
      formFields: normalizeFormFields(body.formFields || []),
      htmlSource: body.htmlSource ?? null,
    });

    return NextResponse.json({ landing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Landing update failed.";
    const status =
      message === "LANDING_NOT_FOUND"
        ? 404
        : message === "FORBIDDEN"
          ? 403
          : message === "PUBLIC_SLUG_ALREADY_EXISTS"
            ? 409
            : 401;
    return NextResponse.json({ message }, { status });
  }
}
