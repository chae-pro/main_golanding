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
        <article className="dashboard-landing-row" key={item.id}>
          <div className="dashboard-landing-main">
            <div className="dashboard-landing-heading">
              <h3>{item.title}</h3>
              <div className="meta-row">
                <span>{item.typeLabel}</span>
                <span>{item.statusLabel}</span>
                <span>{item.publicSlug}</span>
              </div>
            </div>

            <p>{item.description || "아직 설명이 없습니다."}</p>
          </div>

          <div className="dashboard-landing-stats">
            <div className="dashboard-landing-stat">
              <strong>{item.visitorCount}</strong>
              <span>방문자</span>
            </div>
            <div className="dashboard-landing-stat">
              <strong>{item.clickCount}</strong>
              <span>클릭 수</span>
            </div>
          </div>

          <div className="dashboard-landing-actions">
            {item.isPublished ? (
              <>
                <Link className="ghost-button" href={`/l/${item.publicSlug}`}>
                  공개 페이지
                </Link>
                <button
                  className="ghost-button"
                  onClick={() => void copyPublicLink(item.publicSlug)}
                  type="button"
                >
                  {copiedSlug === item.publicSlug ? "복사됨" : "링크 복사"}
                </button>
              </>
            ) : null}

            <Link className="ghost-button" href={`/landings/${item.id}`}>
              상세
            </Link>
            <Link className="primary-button dashboard-analysis-button" href={`/analysis/${item.id}`}>
              분석
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
