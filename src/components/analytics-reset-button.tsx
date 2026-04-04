"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnalyticsResetButton({ landingId }: { landingId: string }) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleReset() {
    const confirmed = window.confirm(
      "정말 데이터를 리셋하시겠습니까?\n리셋이 되면 이전 체류데이터가 모두 삭제됩니다.",
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

      setMessage("이전 분석 데이터를 모두 삭제했습니다.");
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
        {isResetting ? "데이터 리셋 중..." : "기존 데이터 리셋"}
      </button>
      <p className="meta-inline">새 테스트 전에 이전 방문·체류·클릭 데이터를 비울 때 사용합니다.</p>
      {message ? <p className="meta-inline">{message}</p> : null}
    </div>
  );
}
