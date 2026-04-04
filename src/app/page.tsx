import Link from "next/link";

import { getLandingMetrics } from "@/server/analytics-service";
import { isAdminEmail } from "@/server/admin-auth";
import { listLandingsByOwner } from "@/server/landing-service";
import { getCurrentCreatorSession } from "@/server/session-auth";

function getLandingTypeLabel(type: "button" | "form" | "html") {
  if (type === "button") {
    return "버튼형";
  }
  if (type === "form") {
    return "DB 수집형";
  }
  return "HTML 삽입형";
}

function getLandingStatusLabel(status: "draft" | "published" | "archived") {
  if (status === "draft") {
    return "초안";
  }
  if (status === "published") {
    return "발행중";
  }
  return "보관됨";
}

export default async function HomePage() {
  const auth = await getCurrentCreatorSession();
  const adminAccess = auth ? isAdminEmail(auth.session.email) : false;
  const landings = auth ? await listLandingsByOwner(auth.session.email) : [];
  const landingMetrics = await Promise.all(
    landings.map(async (landing) => ({
      landing,
      metrics: await getLandingMetrics(landing.id),
    })),
  );
  const totalVisitors = landingMetrics.reduce((sum, item) => sum + item.metrics.visitorCount, 0);
  const totalClicks = landingMetrics.reduce((sum, item) => sum + item.metrics.totalClickCount, 0);
  const totalForms = landingMetrics.reduce(
    (sum, item) => sum + item.metrics.formSubmissionCount,
    0,
  );

  return (
    <main>
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">고랜딩</span>
          <h2>랜딩 제작과 성과 분석을 한 화면에서 시작하세요.</h2>
          <p>
            로그인, 랜딩 초안 생성, 랜딩 목록 관리, 클릭 히트맵, 스크롤맵, 20등분 기준
            체류맵 분석까지 바로 사용할 수 있습니다.
          </p>
          <div className="link-row">
            <Link className="primary-button primary-button-wide" href={auth ? "/landings/new" : "/login"}>
              {auth ? "랜딩 만들기" : "로그인"}
            </Link>
            {auth ? null : (
              <Link className="ghost-button" href="/signup">
                가입 신청
              </Link>
            )}
            {adminAccess ? (
              <Link className="ghost-button" href="/admin">
                관리자 페이지
              </Link>
            ) : null}
            {auth ? null : !adminAccess ? (
              <span className="session-chip">승인된 이메일만 제작자 기능을 사용할 수 있습니다</span>
            ) : null}
          </div>
        </div>

        <div className="panel hero-side">
          <div className="hero-metrics">
            <div className="metric-card">
              <strong>{landings.length}</strong>
              <p>내 랜딩 수</p>
            </div>
            <div className="metric-card">
              <strong>{totalVisitors}</strong>
              <p>총 방문자</p>
            </div>
            <div className="metric-card">
              <strong>{totalClicks}</strong>
              <p>총 클릭 수</p>
            </div>
            <div className="metric-card">
              <strong>{totalForms}</strong>
              <p>폼 제출 수</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">랜딩 목록</span>
          <h2>{auth ? "내 랜딩" : "로그인 후 내 랜딩을 확인할 수 있습니다"}</h2>
          <p>
            {auth
              ? "현재 로그인한 계정 기준으로 내 랜딩만 표시됩니다."
              : "로그인 전에는 랜딩 관리와 분석 기능이 숨겨집니다."}
          </p>
        </div>

        {auth ? (
          landingMetrics.length > 0 ? (
            <div className="list-grid">
              {landingMetrics.map(({ landing, metrics }) => (
                <article className="list-item" key={landing.id}>
                  <div>
                    <h3>{landing.title}</h3>
                    <div className="meta-row">
                      <span>{getLandingTypeLabel(landing.type)}</span>
                      <span>{getLandingStatusLabel(landing.status)}</span>
                      <span>{landing.publicSlug}</span>
                    </div>
                  </div>

                  <p>{landing.description || "아직 설명이 없습니다."}</p>

                  <div className="metrics-grid">
                    <div className="detail-card">
                      <strong>{metrics.visitorCount}</strong>
                      <p>방문자</p>
                    </div>
                    <div className="detail-card">
                      <strong>{metrics.totalClickCount}</strong>
                      <p>클릭 수</p>
                    </div>
                  </div>

                  <div className="link-row">
                    {landing.status === "published" ? (
                      <Link className="text-link" href={`/l/${landing.publicSlug}`}>
                        공개 페이지
                      </Link>
                    ) : null}
                    <Link className="text-link" href={`/landings/${landing.id}`}>
                      상세
                    </Link>
                    <Link className="text-link" href={`/analysis/${landing.id}`}>
                      분석
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="detail-card">
              <strong>아직 랜딩이 없습니다</strong>
              <p>첫 랜딩을 만들어 방문, 클릭, 스크롤, 체류 데이터를 수집해보세요.</p>
            </div>
          )
        ) : (
          <div className="detail-card">
            <strong>제작자 접근이 잠겨 있습니다</strong>
            <p>승인된 이메일로 로그인해야 랜딩 생성, 수정, 분석 기능을 사용할 수 있습니다.</p>
          </div>
        )}
      </section>
    </main>
  );
}
