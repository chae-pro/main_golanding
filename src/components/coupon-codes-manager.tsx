"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CouponCode } from "@/domain/types";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type EditableCoupon = {
  id: string;
  code: string;
  validDays: string;
  maxUses: string;
  redeemedCount: number;
  remainingUses: number;
  status: CouponCode["status"];
  createdAt: string;
};

function mapCoupon(coupon: CouponCode): EditableCoupon {
  return {
    id: coupon.id,
    code: coupon.code,
    validDays: String(coupon.validDays),
    maxUses: String(coupon.maxUses),
    redeemedCount: coupon.redeemedCount,
    remainingUses: coupon.remainingUses,
    status: coupon.status,
    createdAt: coupon.createdAt,
  };
}

export function CouponCodesManager({
  initialCoupons,
}: {
  initialCoupons: CouponCode[];
}) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons.map(mapCoupon));
  const [form, setForm] = useState({
    code: "",
    validDays: "30",
    maxUses: "10",
  });
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [rowState, setRowState] = useState<Record<string, SubmitState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingCouponId, setSavingCouponId] = useState<string | null>(null);

  async function reloadCoupons() {
    const response = await fetch("/api/admin/coupons", {
      method: "GET",
      cache: "no-store",
    });
    const result = (await response.json()) as { message?: string; coupons?: CouponCode[] };

    if (!response.ok || !result.coupons) {
      throw new Error(result.message ?? "쿠폰 목록을 불러오지 못했습니다.");
    }

    setCoupons(result.coupons.map(mapCoupon));
  }

  function updateCoupon(couponId: string, field: "validDays" | "maxUses", value: string) {
    setCoupons((previous) =>
      previous.map((coupon) =>
        coupon.id === couponId ? { ...coupon, [field]: value } : coupon,
      ),
    );
  }

  async function createCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setState({ status: "idle" });

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: form.code,
          validDays: Number(form.validDays),
          maxUses: Number(form.maxUses),
        }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "쿠폰 생성에 실패했습니다.");
      }

      setForm({
        code: "",
        validDays: "30",
        maxUses: "10",
      });
      await reloadCoupons();
      setState({ status: "success", message: "쿠폰이 생성되었습니다." });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "쿠폰 생성에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveCoupon(couponId: string) {
    const coupon = coupons.find((item) => item.id === couponId);

    if (!coupon) {
      return;
    }

    setSavingCouponId(couponId);
    setRowState((previous) => ({ ...previous, [couponId]: { status: "idle" } }));

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          couponId,
          validDays: Number(coupon.validDays),
          maxUses: Number(coupon.maxUses),
        }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "쿠폰 수정에 실패했습니다.");
      }

      await reloadCoupons();
      setRowState((previous) => ({
        ...previous,
        [couponId]: { status: "success", message: "저장되었습니다." },
      }));
      router.refresh();
    } catch (error) {
      setRowState((previous) => ({
        ...previous,
        [couponId]: {
          status: "error",
          message: error instanceof Error ? error.message : "쿠폰 수정에 실패했습니다.",
        },
      }));
    } finally {
      setSavingCouponId(null);
    }
  }

  return (
    <section className="panel list-panel">
      <div className="section-heading">
        <span className="eyebrow">쿠폰</span>
        <h2>쿠폰 관리</h2>
      </div>

      <form className="admin-coupon-form" onSubmit={createCoupon}>
        <label className="admin-inline-field">
          <span>쿠폰번호</span>
          <input
            required
            type="text"
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
          />
        </label>

        <label className="admin-inline-field">
          <span>사용 기간(일)</span>
          <input
            min={1}
            required
            type="number"
            value={form.validDays}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, validDays: event.target.value }))
            }
          />
        </label>

        <label className="admin-inline-field">
          <span>사용 가능 인원</span>
          <input
            min={1}
            required
            type="number"
            value={form.maxUses}
            onChange={(event) => setForm((prev) => ({ ...prev, maxUses: event.target.value }))}
          />
        </label>

        <button className="primary-button admin-line-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "생성 중..." : "쿠폰 생성"}
        </button>
      </form>

      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "status-success" : "status-error"}>
          {state.message}
        </p>
      ) : null}

      <div className="admin-line-list">
        {coupons.length > 0 ? (
          coupons.map((coupon) => {
            const couponState = rowState[coupon.id];

            return (
              <article className="admin-line-row" key={coupon.id}>
                <div className="admin-line-main admin-line-main-coupons">
                  <div className="admin-line-title-block">
                    <strong>{coupon.code}</strong>
                    <span>{coupon.status === "active" ? "사용 가능" : "중지됨"}</span>
                  </div>

                  <label className="admin-inline-field">
                    <span>기간(일)</span>
                    <input
                      min={1}
                      type="number"
                      value={coupon.validDays}
                      onChange={(event) =>
                        updateCoupon(coupon.id, "validDays", event.target.value)
                      }
                    />
                  </label>

                  <label className="admin-inline-field">
                    <span>가능 인원</span>
                    <input
                      min={coupon.redeemedCount}
                      type="number"
                      value={coupon.maxUses}
                      onChange={(event) => updateCoupon(coupon.id, "maxUses", event.target.value)}
                    />
                  </label>

                  <div className="admin-line-info">사용 {coupon.redeemedCount}명</div>
                  <div className="admin-line-info">남은 {coupon.remainingUses}명</div>
                  <div className="admin-line-info">
                    {new Date(coupon.createdAt).toLocaleDateString("ko-KR")}
                  </div>
                </div>

                <div className="admin-line-actions">
                  <button
                    className="ghost-button admin-line-button"
                    disabled={savingCouponId === coupon.id}
                    onClick={() => void saveCoupon(coupon.id)}
                    type="button"
                  >
                    {savingCouponId === coupon.id ? "저장 중..." : "저장"}
                  </button>
                </div>

                {couponState && couponState.status !== "idle" ? (
                  <p className={couponState.status === "success" ? "status-success" : "status-error"}>
                    {couponState.message}
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="detail-card">
            <strong>생성된 쿠폰이 없습니다</strong>
            <p>쿠폰번호, 기간, 사용 가능 인원을 입력해 먼저 쿠폰을 만들어주세요.</p>
          </div>
        )}
      </div>
    </section>
  );
}
