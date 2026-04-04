"use client";

import Link from "next/link";
import { useState } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function SignupRequestForm() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    cohort: "",
    coupon: "",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setState({ status: "idle" });

    try {
      const response = await fetch("/api/signup-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as { message?: string; autoApproved?: boolean };

      if (!response.ok) {
        throw new Error(result.message ?? "회원가입 신청에 실패했습니다.");
      }

      setForm({
        email: "",
        name: "",
        cohort: "",
        coupon: "",
        note: "",
      });
      setState({
        status: "success",
        message: result.autoApproved
          ? "쿠폰이 적용되어 바로 사용할 수 있습니다. 이제 로그인해주세요."
          : "회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "회원가입 신청에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <div className="section-heading">
        <span className="eyebrow">회원가입</span>
        <h2>고랜딩 회원가입</h2>
        <p>이메일과 기본 정보를 남기면 관리자가 확인 후 사용 권한을 승인합니다.</p>
      </div>

      <label>
        이메일
        <input
          required
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
      </label>

      <label>
        이름
        <input
          required
          type="text"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
      </label>

      <label>
        기수 또는 구분
        <input
          type="text"
          value={form.cohort}
          onChange={(event) => setForm((prev) => ({ ...prev, cohort: event.target.value }))}
        />
      </label>

      <label>
        쿠폰
        <input
          type="text"
          value={form.coupon}
          onChange={(event) => setForm((prev) => ({ ...prev, coupon: event.target.value }))}
          placeholder="쿠폰 코드가 있으면 입력해주세요."
        />
      </label>

      <label>
        메모
        <textarea
          rows={4}
          value={form.note}
          onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
          placeholder="필요하면 간단한 소개나 요청 사항을 적어주세요."
        />
      </label>

      <div className="link-row">
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "신청 중..." : "회원가입 신청하기"}
        </button>
        <Link className="ghost-button" href="/login">
          로그인으로 돌아가기
        </Link>
      </div>

      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "status-success" : "status-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
