import { NextResponse } from "next/server";

import type { LandingCreateInput, LandingFormField, LandingImage } from "@/domain/types";
import { requireCreatorAuth } from "@/server/creator-auth";
import { createLandingFast, listLandingsByOwner } from "@/server/landing-service";

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
        { message: "제목, 공개 슬러그, 랜딩 유형은 필수입니다." },
        { status: 400 },
      );
    }

    if (body.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
      return NextResponse.json({ message: "소유자 이메일이 일치하지 않습니다." }, { status: 403 });
    }

    const landing = await createLandingFast({
      ...body,
      images: normalizeImages(body.images || []),
      buttons: body.buttons || [],
      formFields: normalizeFormFields(body.formFields || []),
      htmlSource: body.htmlSource ?? null,
    });

    return NextResponse.json({ landing }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "랜딩 생성 중 알 수 없는 오류가 발생했습니다.";
    const status =
      message === "PUBLIC_SLUG_ALREADY_EXISTS"
        ? 409
        : message === "META_PIXEL_ID_INVALID"
          ? 400
          : 401;

    return NextResponse.json(
      {
        message:
          message === "PUBLIC_SLUG_ALREADY_EXISTS"
            ? "이미 사용 중인 공개 슬러그입니다."
            : message === "META_PIXEL_ID_INVALID"
              ? "메타 픽셀 ID는 숫자만 입력할 수 있습니다."
              : message,
      },
      { status },
    );
  }
}
