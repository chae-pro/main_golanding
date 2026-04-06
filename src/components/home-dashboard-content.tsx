"use client";

import { useEffect, useMemo, useState } from "react";

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

const DASHBOARD_CACHE_KEY = "golanding-dashboard-cache-v2";
let dashboardMemoryCache: DashboardResponse | null = null;

function getGuestTotals() {
  return {
    landingCount: 0,
    totalVisitors: 0,
    totalClicks: 0,
    totalForms: 0,
  };
}

function readCachedDashboard(): DashboardResponse | null {
  if (dashboardMemoryCache) {
    return dashboardMemoryCache;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cachedRaw = window.sessionStorage.getItem(DASHBOARD_CACHE_KEY);

    if (!cachedRaw) {
      return null;
    }

    const cached = JSON.parse(cachedRaw) as DashboardResponse;
    dashboardMemoryCache = cached;
    return cached;
  } catch {
    return null;
  }
}

function writeCachedDashboard(data: DashboardResponse) {
  dashboardMemoryCache = data;

  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data));
}

function clearCachedDashboard() {
  dashboardMemoryCache = null;

  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
}

export function HomeDashboardContent() {
  const cached = useMemo(readCachedDashboard, []);

  const [email, setEmail] = useState<string | null>(cached?.email ?? null);
  const [adminAccess, setAdminAccess] = useState(cached?.adminAccess ?? false);
  const [items, setItems] = useState<DashboardLandingItem[]>(cached?.items ?? []);
  const [totals, setTotals] = useState(cached?.totals ?? getGuestTotals());
  const [isLoaded, setIsLoaded] = useState(Boolean(cached));

  useEffect(() => {
    let active = true;

    void fetch("/api/dashboard", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          clearCachedDashboard();

          if (active) {
            setEmail(null);
            setAdminAccess(false);
            setItems([]);
            setTotals(getGuestTotals());
            setIsLoaded(true);
          }

          return null;
        }

        if (!response.ok) {
          throw new Error("DASHBOARD_LOAD_FAILED");
        }

        return (await response.json()) as DashboardResponse;
      })
      .then((result) => {
        if (!active || !result) {
          return;
        }

        writeCachedDashboard(result);
        setEmail(result.email);
        setAdminAccess(result.adminAccess);
        setItems(result.items);
        setTotals(result.totals);
        setIsLoaded(true);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        if (!cached) {
          setEmail(null);
          setAdminAccess(false);
          setItems([]);
          setTotals(getGuestTotals());
        }

        setIsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [cached]);

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
                <p>첫 랜딩을 만들고 방문, 클릭, 체류 데이터를 확인해보세요.</p>
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
            <strong>로그인 후 사용할 수 있습니다</strong>
            <p>회원가입 또는 로그인 후 랜딩 생성과 분석 기능을 사용할 수 있습니다.</p>
          </div>
        )}
      </section>
    </>
  );
}
