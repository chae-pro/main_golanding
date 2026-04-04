"use client";

import Link from "next/link";
import { useState } from "react";

type DashboardLandingRow = {
  id: string;
  title: string;
  typeLabel: string;
  statusLabel: string;
  publicSlug: string;
  description?: string;
  visitorCount: number;
  clickCount: number;
  isPublished: boolean;
};

export function DashboardLandingList({ items }: { items: DashboardLandingRow[] }) {
  const [rows, setRows] = useState(items);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  async function copyPublicLink(publicSlug: string) {
    const url = `${window.location.origin}/l/${publicSlug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(publicSlug);
    window.setTimeout(() => {
      setCopiedSlug((current) => (current === publicSlug ? null : current));
    }, 1800);
  }

  async function toggleLandingStatus(row: DashboardLandingRow) {
    const nextStatus = row.isPublished ? "archived" : "published";
    setPendingId(row.id);

    try {
      const response = await fetch(`/api/landings/${row.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const result = (await response.json()) as {
        landing?: {
          status: "draft" | "published" | "archived";
        };
        message?: string;
      };

      if (!response.ok || !result.landing) {
        throw new Error(result.message ?? "상태 변경에 실패했습니다.");
      }

      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                isPublished: result.landing?.status === "published",
                statusLabel:
                  result.landing?.status === "published"
                    ? "발행중"
                    : result.landing?.status === "archived"
                      ? "사용중지"
                      : "초안",
              }
            : item,
        ),
      );
    } finally {
      setPendingId(null);
    }
  }

  async function duplicateRow(row: DashboardLandingRow) {
    setDuplicatingId(row.id);

    try {
      const response = await fetch(`/api/landings/${row.id}/duplicate`, {
        method: "POST",
      });

      const result = (await response.json()) as {
        landing?: {
          id: string;
          title: string;
          type: "button" | "form" | "html";
          status: "draft" | "published" | "archived";
          publicSlug: string;
          description?: string;
        };
        message?: string;
      };

      if (!response.ok || !result.landing) {
        throw new Error(result.message ?? "랜딩 복사에 실패했습니다.");
      }

      const landing = result.landing;
      const typeLabel =
        landing.type === "button"
          ? "버튼형"
          : landing.type === "form"
            ? "DB 수집형"
            : "HTML 삽입형";

      const statusLabel =
        landing.status === "published"
          ? "사용 중"
          : landing.status === "archived"
            ? "사용중지"
            : "초안";

      setRows((current) => [
        {
          id: landing.id,
          title: landing.title,
          typeLabel,
          statusLabel,
          publicSlug: landing.publicSlug,
          description: landing.description,
          visitorCount: 0,
          clickCount: 0,
          isPublished: landing.status === "published",
        },
        ...current,
      ]);
    } finally {
      setDuplicatingId(null);
    }
  }

  return (
    <div className="dashboard-landing-list">
      {rows.map((item) => (
        <article className="dashboard-landing-bar" key={item.id}>
          <Link className="dashboard-landing-title" href={`/landings/${item.id}`}>
            {item.title}
          </Link>

          <div className="dashboard-landing-info">{item.typeLabel}</div>

          <div className="dashboard-landing-info">
            방문자 <strong>{item.visitorCount}</strong>
          </div>

          <div className="dashboard-landing-info">
            클릭수 <strong>{item.clickCount}</strong>
          </div>

          <button
            className="ghost-button dashboard-inline-button"
            disabled={!item.isPublished}
            onClick={() => (item.isPublished ? void copyPublicLink(item.publicSlug) : undefined)}
            type="button"
          >
            {item.isPublished
              ? copiedSlug === item.publicSlug
                ? "복사됨"
                : "링크복사"
              : "발행전"}
          </button>

          <Link className="ghost-button dashboard-inline-button" href={`/landings/${item.id}/edit`}>
            수정
          </Link>

          <button
            className="ghost-button dashboard-inline-button"
            disabled={duplicatingId === item.id}
            onClick={() => void duplicateRow(item)}
            type="button"
          >
            {duplicatingId === item.id ? "복사 중" : "복사"}
          </button>

          <Link className="primary-button dashboard-inline-button" href={`/analysis/${item.id}`}>
            분석
          </Link>

          <button
            className={`dashboard-status-toggle ${
              item.isPublished ? "dashboard-status-toggle-on" : "dashboard-status-toggle-off"
            }`}
            disabled={pendingId === item.id}
            onClick={() => void toggleLandingStatus(item)}
            type="button"
          >
            <span className="dashboard-status-track" />
            <strong>
              {pendingId === item.id ? "변경 중" : item.isPublished ? "사용 중" : "사용중지"}
            </strong>
          </button>

          <div
            className="dashboard-landing-status-label"
            aria-hidden="true"
          >
            {item.isPublished ? "발행중" : item.statusLabel}
          </div>
        </article>
      ))}
    </div>
  );
}
