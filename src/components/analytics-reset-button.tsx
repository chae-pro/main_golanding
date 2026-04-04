"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnalyticsResetButton({ landingId }: { landingId: string }) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleReset() {
    const confirmed = window.confirm(
      "이 랜딩의 방문, 클릭, 체류, 폼 제출 데이터를 모두 삭제합니다. 계속하시겠습니까?",
    );

    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/landings/${landingId}/analytics/reset`, {
        method: "POST",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "분석 데이터 초기화에 실패했습니다.");
      }

      setMessage("분석 데이터를 초기화했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "분석 데이터 초기화에 실패했습니다.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="analytics-reset-box">
      <button className="ghost-button" disabled={isResetting} onClick={handleReset} type="button">
        {isResetting ? "초기화 중..." : "분석 데이터 초기화"}
      </button>
      {message ? <p className="meta-inline">{message}</p> : null}
    </div>
  );
}
