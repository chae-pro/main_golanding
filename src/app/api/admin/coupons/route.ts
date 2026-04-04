import { NextResponse } from "next/server";

import { requireAdminSession } from "@/server/admin-auth";
import {
  createCouponCode,
  deleteCouponCode,
  listCouponCodes,
  updateCouponCode,
} from "@/server/access-service";

function getCouponErrorMessage(message: string) {
  if (message === "COUPON_CODE_REQUIRED") {
    return "쿠폰번호를 입력해주세요.";
  }
  if (message === "COUPON_VALID_DAYS_INVALID") {
    return "사용 기간은 1일 이상이어야 합니다.";
  }
  if (message === "COUPON_MAX_USES_INVALID") {
    return "사용 가능 인원은 1명 이상이어야 합니다.";
  }
  if (message === "COUPON_CODE_ALREADY_EXISTS") {
    return "이미 존재하는 쿠폰번호입니다.";
  }
  if (message === "COUPON_MAX_USES_BELOW_REDEEMED") {
    return "이미 사용한 인원보다 적게는 설정할 수 없습니다.";
  }
  if (message === "COUPON_ALREADY_REDEEMED") {
    return "이미 사용 이력이 있는 쿠폰은 삭제할 수 없습니다.";
  }
  if (message === "COUPON_NOT_FOUND") {
    return "쿠폰을 찾을 수 없습니다.";
  }
  if (message === "UNAUTHORIZED") {
    return "로그인이 필요합니다.";
  }
  if (message === "FORBIDDEN") {
    return "권한이 없습니다.";
  }
  return "쿠폰 처리에 실패했습니다.";
}

export async function GET() {
  try {
    await requireAdminSession();
    const coupons = await listCouponCodes();
    return NextResponse.json({ coupons });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ message: getCouponErrorMessage(message) }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as {
      code?: string;
      validDays?: number;
      maxUses?: number;
    };

    const coupon = await createCouponCode({
      code: body.code ?? "",
      validDays: Number(body.validDays),
      maxUses: Number(body.maxUses),
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = [
      "COUPON_CODE_REQUIRED",
      "COUPON_VALID_DAYS_INVALID",
      "COUPON_MAX_USES_INVALID",
      "COUPON_CODE_ALREADY_EXISTS",
    ].includes(message)
      ? 400
      : message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;

    return NextResponse.json({ message: getCouponErrorMessage(message) }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as {
      couponId?: string;
      validDays?: number;
      maxUses?: number;
    };

    const coupon = await updateCouponCode({
      couponId: body.couponId ?? "",
      validDays: Number(body.validDays),
      maxUses: Number(body.maxUses),
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = [
      "COUPON_VALID_DAYS_INVALID",
      "COUPON_MAX_USES_INVALID",
      "COUPON_MAX_USES_BELOW_REDEEMED",
      "COUPON_NOT_FOUND",
    ].includes(message)
      ? 400
      : message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;

    return NextResponse.json({ message: getCouponErrorMessage(message) }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as { couponId?: string };

    await deleteCouponCode(body.couponId ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = ["COUPON_NOT_FOUND", "COUPON_ALREADY_REDEEMED"].includes(message)
      ? 400
      : message === "UNAUTHORIZED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;

    return NextResponse.json({ message: getCouponErrorMessage(message) }, { status });
  }
}
