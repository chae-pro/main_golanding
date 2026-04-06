"use client";

import { useEffect, useState } from "react";

import { DashboardLandingList } from "@/components/dashboard-landing-list";
import { AppLink } from "@/components/navigation-progress";

type DashboardLandingItem = {
  id: string;
  title: string;
  createdAt: string;
  typeLabel: string;
  statusLabel: string;
  publicSlug: string;
  description?: string;
  visitorCount: number;
  clickCount: number;
  isPublished: boolean;
};

type DashboardResponse = {
  email: string;
  adminAccess: boolean;
  items: DashboardLandingItem[];
  totals: {
    landingCount: number;
    totalVisitors: number;
    totalClicks: number;
    totalForms: number;
  };
};

export function HomeDashboardContent({
  email,
  adminAccess,
}: {
  email: string | null;
  adminAccess: boolean;
}) {
  const [items, setItems] = useState<DashboardLandingItem[]>([]);
  const [totals, setTotals] = useState({
    landingCount: 0,
    totalVisitors: 0,
    totalClicks: 0,
    totalForms: 0,
  });
  const [isLoaded, setIsLoaded] = useState(!email);

  useEffect(() => {
    let active = true;

    if (!email) {
      setItems([]);
      setTotals({
        landingCount: 0,
        totalVisitors: 0,
        totalClicks: 0,
        totalForms: 0,
      });
      setIsLoaded(true);
      return () => {
        active = false;
      };
    }

    setIsLoaded(false);

    void fetch("/api/dashboard", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("DASHBOARD_LOAD_FAILED");
        }

        return (await response.json()) as DashboardResponse;
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setItems(result.items);
        setTotals(result.totals);
        setIsLoaded(true);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setItems([]);
        setTotals({
          landingCount: 0,
          totalVisitors: 0,
          totalClicks: 0,
          totalForms: 0,
        });
        setIsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [email]);

  return (
    <>
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">고랜딩</span>
          <h2>랜딩 제작과 성과 분석을 한 화면에서 시작하세요.</h2>
          <div className="link-row">
            <AppLink className="primary-button primary-button-wide" href={email ? "/landings/new" : "/login"}>
              {email ? "랜딩 만들기" : "로그인"}
            </AppLink>
            {email ? null : (
              <AppLink className="ghost-button" href="/signup">
                회원가입
              </AppLink>
            )}
            {adminAccess ? (
              <AppLink className="ghost-button" href="/admin">
                관리자 페이지
              </AppLink>
            ) : null}
          </div>
        </div>

        <div className="panel hero-side">
          <div className="hero-metrics">
            <div className="metric-card">
              <strong>{isLoaded ? totals.landingCount : "..."}</strong>
              <p>내 랜딩 수</p>
            </div>
            <div className="metric-card">
              <strong>{isLoaded ? totals.totalVisitors : "..."}</strong>
              <p>총 방문자</p>
            </div>
            <div className="metric-card">
              <strong>{isLoaded ? totals.totalClicks : "..."}</strong>
              <p>총 클릭 수</p>
            </div>
            <div className="metric-card">
              <strong>{isLoaded ? totals.totalForms : "..."}</strong>
              <p>폼 제출 수</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">랜딩 목록</span>
          <h2>{email ? "생성된 랜딩페이지" : "로그인 후 생성된 랜딩페이지를 확인할 수 있습니다"}</h2>
        </div>

        {email ? (
          isLoaded ? (
            items.length > 0 ? (
              <DashboardLandingList items={items} />
            ) : (
              <div className="detail-card">
                <strong>아직 랜딩이 없습니다</strong>
                <p>첫 랜딩을 만든 뒤 방문, 클릭, 체류 데이터를 확인해보세요.</p>
              </div>
            )
          ) : (
            <div className="dashboard-landing-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <article className="dashboard-landing-bar dashboard-landing-bar-skeleton" key={`landing-skeleton-${index}`}>
                  <div className="dashboard-landing-title-block">
                    <span className="skeleton-line skeleton-line-title" />
                    <span className="skeleton-line skeleton-line-sub" />
                  </div>
                  <span className="skeleton-line skeleton-line-small" />
                  <div className="dashboard-landing-metrics">
                    <span className="skeleton-line skeleton-line-small" />
                    <span className="skeleton-line skeleton-line-small" />
                  </div>
                  <span className="ghost-button dashboard-inline-button dashboard-inline-button-center button-placeholder">로딩</span>
                  <span className="ghost-button dashboard-inline-button dashboard-inline-button-center button-placeholder">로딩</span>
                  <span className="ghost-button dashboard-inline-button dashboard-inline-button-center button-placeholder">로딩</span>
                  <span className="ghost-button dashboard-inline-button dashboard-inline-button-center button-placeholder">로딩</span>
                  <span className="primary-button dashboard-inline-button button-placeholder">로딩</span>
                  <span className="dashboard-status-toggle dashboard-status-toggle-off button-placeholder">로딩</span>
                </article>
              ))}
            </div>
          )
        ) : (
          <div className="detail-card">
            <strong>로그인 후 시작할 수 있습니다</strong>
            <p>회원가입 또는 로그인 후 랜딩 생성과 분석 기능을 사용할 수 있습니다.</p>
          </div>
        )}
      </section>
    </>
  );
}
