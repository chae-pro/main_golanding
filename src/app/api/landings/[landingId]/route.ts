import { NextResponse } from "next/server";

import type { LandingCreateInput, LandingFormField, LandingImage } from "@/domain/types";
import { requireCreatorAuthSnapshot } from "@/server/creator-auth";
import { deleteLanding, getLandingById, updateLandingFast, updateLandingStatus } from "@/server/landing-service";

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
  const auth = await requireCreatorAuthSnapshot();
  const { landingId } = await context.params;
  const landing = await getLandingById(landingId);

  if (!landing) {
    return NextResponse.json({ message: "랜딩을 찾을 수 없습니다." }, { status: 404 });
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    return NextResponse.json({ message: "접근 권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({ landing });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireCreatorAuthSnapshot();
    const { landingId } = await context.params;
    const body = (await request.json()) as {
      status?: "draft" | "published" | "archived";
    };

    if (!body.status) {
      return NextResponse.json({ message: "상태값이 필요합니다." }, { status: 400 });
    }

    const landing = await updateLandingStatus({
      landingId,
      ownerEmail: auth.session.email,
      status: body.status,
    });

    return NextResponse.json({ landing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "상태 변경에 실패했습니다.";
    const status =
      message === "LANDING_NOT_FOUND" ? 404 : message === "FORBIDDEN" ? 403 : 401;

    return NextResponse.json(
      {
        message:
          message === "LANDING_NOT_FOUND"
            ? "랜딩을 찾을 수 없습니다."
            : message === "FORBIDDEN"
              ? "접근 권한이 없습니다."
              : message,
      },
      { status },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireCreatorAuthSnapshot();
    const { landingId } = await context.params;
    const body = (await request.json()) as LandingCreateInput;

    if (!body.title || !body.publicSlug || !body.type) {
      return NextResponse.json(
        { message: "제목, 공개 슬러그, 랜딩 유형은 필수입니다." },
        { status: 400 },
      );
    }

    if (body.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
      return NextResponse.json({ message: "소유자 이메일이 일치하지 않습니다." }, { status: 403 });
    }

    const landing = await updateLandingFast({
      landingId,
      ...body,
      images: normalizeImages(body.images || []),
      buttons: body.buttons || [],
      formFields: normalizeFormFields(body.formFields || []),
      htmlSource: body.htmlSource ?? null,
    });

    return NextResponse.json({ landing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "랜딩 수정에 실패했습니다.";
    const status =
      message === "LANDING_NOT_FOUND"
        ? 404
        : message === "FORBIDDEN"
          ? 403
          : message === "PUBLIC_SLUG_ALREADY_EXISTS"
            ? 409
            : message === "META_PIXEL_ID_INVALID"
              ? 400
              : 401;

    return NextResponse.json(
      {
        message:
          message === "LANDING_NOT_FOUND"
            ? "랜딩을 찾을 수 없습니다."
            : message === "FORBIDDEN"
              ? "접근 권한이 없습니다."
              : message === "PUBLIC_SLUG_ALREADY_EXISTS"
                ? "이미 사용 중인 공개 슬러그입니다."
                : message === "META_PIXEL_ID_INVALID"
                  ? "메타 픽셀 ID는 숫자만 입력할 수 있습니다."
                  : message,
      },
      { status },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireCreatorAuthSnapshot();
    const { landingId } = await context.params;
    await deleteLanding({
      landingId,
      ownerEmail: auth.session.email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "랜딩 삭제에 실패했습니다.";
    const status =
      message === "LANDING_NOT_FOUND" ? 404 : message === "FORBIDDEN" ? 403 : 401;

    return NextResponse.json(
      {
        message:
          message === "LANDING_NOT_FOUND"
            ? "랜딩을 찾을 수 없습니다."
            : message === "FORBIDDEN"
              ? "접근 권한이 없습니다."
              : message,
      },
      { status },
    );
  }
}
