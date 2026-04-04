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
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function copyPublicLink(publicSlug: string) {
    const url = `${window.location.origin}/l/${publicSlug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(publicSlug);
    window.setTimeout(() => {
      setCopiedSlug((current) => (current === publicSlug ? null : current));
    }, 1800);
  }

  return (
    <div className="dashboard-landing-list">
      {items.map((item) => (
        <article className="dashboard-landing-bar" key={item.id}>
          <Link className="dashboard-landing-title" href={`/landings/${item.id}`}>
            {item.title}
          </Link>

          <div className="dashboard-landing-info">랜딩형식 - {item.typeLabel}</div>

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

          <Link className="primary-button dashboard-inline-button" href={`/analysis/${item.id}`}>
            분석
          </Link>

          <div
            className={`dashboard-status-toggle ${
              item.isPublished ? "dashboard-status-toggle-on" : "dashboard-status-toggle-off"
            }`}
          >
            <span className="dashboard-status-track" />
            <strong>{item.isPublished ? "사용 중" : item.statusLabel}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}
