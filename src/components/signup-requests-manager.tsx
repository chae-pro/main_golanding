"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { SignupRequest } from "@/domain/types";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function getSignupStatusLabel(status: SignupRequest["status"]) {
  if (status === "pending") {
    return "대기중";
  }
  if (status === "approved") {
    return "승인됨";
  }
  return "반려됨";
}

export function SignupRequestsManager({
  initialSignupRequests,
}: {
  initialSignupRequests: SignupRequest[];
}) {
  const router = useRouter();
  const [signupRequests, setSignupRequests] = useState(initialSignupRequests);
  const [rowState, setRowState] = useState<Record<string, SubmitState>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function reloadSignupRequests() {
    const response = await fetch("/api/admin/signup-requests", {
      method: "GET",
      cache: "no-store",
    });
    const result = (await response.json()) as {
      message?: string;
      signupRequests?: SignupRequest[];
    };

    if (!response.ok || !result.signupRequests) {
      throw new Error(result.message ?? "가입 신청 목록을 불러오지 못했습니다.");
    }

    setSignupRequests(result.signupRequests);
  }

  async function reviewRequest(requestId: string, action: "approve" | "reject") {
    setProcessingId(requestId);
    setRowState((previous) => ({ ...previous, [requestId]: { status: "idle" } }));

    try {
      const response = await fetch(`/api/admin/signup-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "가입 신청 처리에 실패했습니다.");
      }

      await reloadSignupRequests();
      setRowState((previous) => ({
        ...previous,
        [requestId]: {
          status: "success",
          message: action === "approve" ? "승인되었습니다." : "반려되었습니다.",
        },
      }));
      router.refresh();
    } catch (error) {
      setRowState((previous) => ({
        ...previous,
        [requestId]: {
          status: "error",
          message: error instanceof Error ? error.message : "가입 신청 처리에 실패했습니다.",
        },
      }));
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="panel list-panel">
      <div className="section-heading">
        <span className="eyebrow">가입 신청</span>
        <h2>가입 신청 관리</h2>
      </div>

      <div className="admin-line-list">
        {signupRequests.length > 0 ? (
          signupRequests.map((request) => {
            const state = rowState[request.id];
            const canApprove = request.status !== "approved";
            const canReject = request.status === "pending";

            return (
              <article className="admin-line-row" key={request.id}>
                <div className="admin-line-main">
                  <div className="admin-line-title-block">
                    <strong>{request.email}</strong>
                    <span>{request.name}</span>
                  </div>

                  <div className="admin-line-info">{request.cohort || "-"}</div>
                  <div className="admin-line-info">{getSignupStatusLabel(request.status)}</div>
                  <div className="admin-line-info">
                    {new Date(request.createdAt).toLocaleString("ko-KR")}
                  </div>
                  <div className="admin-line-info">
                    {new Date(request.updatedAt).toLocaleString("ko-KR")}
                  </div>
                  <div className="admin-line-note">{request.note || "-"}</div>
                </div>

                <div className="admin-line-actions">
                  {canApprove ? (
                    <button
                      className="primary-button admin-line-button"
                      disabled={processingId === request.id}
                      onClick={() => void reviewRequest(request.id, "approve")}
                      type="button"
                    >
                      {processingId === request.id ? "처리 중..." : "승인"}
                    </button>
                  ) : null}

                  {canReject ? (
                    <button
                      className="ghost-button admin-line-button"
                      disabled={processingId === request.id}
                      onClick={() => void reviewRequest(request.id, "reject")}
                      type="button"
                    >
                      반려
                    </button>
                  ) : null}
                </div>

                {state && state.status !== "idle" ? (
                  <p className={state.status === "success" ? "status-success" : "status-error"}>
                    {state.message}
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="detail-card">
            <strong>가입 신청이 없습니다</strong>
            <p>아직 접수된 가입 신청이 없습니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}
