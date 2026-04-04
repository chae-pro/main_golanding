"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function ActivateForm() {
  const router = useRouter();
  const [email, setEmail] = useState("classdemo@example.com");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<LoginState>({ status: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setState({ status: "idle" });

    try {
      const response = await fetch("/api/access/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        session?: { email: string; expiresAt: string };
      };

      if (!response.ok || !result.session) {
        throw new Error(result.message ?? "로그인에 실패했습니다.");
      }

      setState({
        status: "success",
        message: `${new Date(result.session.expiresAt).toLocaleString()}까지 로그인 상태가 유지됩니다.`,
      });
      router.push("/landings/new");
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "로그인에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <div className="section-heading">
        <span className="eyebrow">접근 권한</span>
        <h2>고랜딩 로그인</h2>
        <p>승인된 이메일만 로그인할 수 있으며, 서버 세션 방식으로 관리됩니다.</p>
      </div>

      <label>
        승인된 이메일
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>

      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "status-success" : "status-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
