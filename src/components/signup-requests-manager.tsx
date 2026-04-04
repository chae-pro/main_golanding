"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { SignupRequest } from "@/domain/types";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

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
        <p>사용자 신청을 확인하고 승인 또는 반려할 수 있습니다.</p>
      </div>

      <div className="admin-account-list">
        {signupRequests.length > 0 ? (
          signupRequests.map((request) => {
            const isPending = request.status === "pending";
            const state = rowState[request.id];

            return (
              <article className="list-item" key={request.id}>
                <div className="admin-account-header">
                  <div>
                    <h3>{request.email}</h3>
                    <div className="meta-row">
                      <span>{request.name}</span>
                      {request.cohort ? <span>{request.cohort}</span> : null}
                      <span>{request.status === "pending" ? "대기중" : request.status === "approved" ? "승인됨" : "반려됨"}</span>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="link-row">
                      <button
                        className="primary-button"
                        disabled={processingId === request.id}
                        onClick={() => void reviewRequest(request.id, "approve")}
                        type="button"
                      >
                        {processingId === request.id ? "처리 중..." : "승인"}
                      </button>
                      <button
                        className="ghost-button"
                        disabled={processingId === request.id}
                        onClick={() => void reviewRequest(request.id, "reject")}
                        type="button"
                      >
                        반려
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid-two">
                  <div className="detail-card">
                    <strong>{new Date(request.createdAt).toLocaleString()}</strong>
                    <p>신청 시각</p>
                  </div>
                  <div className="detail-card">
                    <strong>{new Date(request.updatedAt).toLocaleString()}</strong>
                    <p>마지막 처리 시각</p>
                  </div>
                </div>

                {request.note ? (
                  <div className="note-box">
                    <strong>신청 메모</strong>
                    <p>{request.note}</p>
                  </div>
                ) : null}

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
