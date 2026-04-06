import { DashboardLandingList } from "@/components/dashboard-landing-list";
import { AppLink } from "@/components/navigation-progress";
import { getLandingDashboardMetrics } from "@/server/analytics-service";
import { listLandingSummariesByOwner } from "@/server/landing-service";

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
  if (status === "published") {
    return "사용 중";
  }
  if (status === "archived") {
    return "사용중지";
  }
  return "발행전";
}

export async function HomeDashboardContent({
  email,
  adminAccess,
}: {
  email: string | null;
  adminAccess: boolean;
}) {
  const landings = email ? await listLandingSummariesByOwner(email) : [];
  const landingMetrics = await getLandingDashboardMetrics(landings.map((landing) => landing.id));
  const totalVisitors = landings.reduce(
    (sum, landing) => sum + (landingMetrics.get(landing.id)?.visitorCount ?? 0),
    0,
  );
  const totalClicks = landings.reduce(
    (sum, landing) => sum + (landingMetrics.get(landing.id)?.totalClickCount ?? 0),
    0,
  );
  const totalForms = landings.reduce(
    (sum, landing) => sum + (landingMetrics.get(landing.id)?.formSubmissionCount ?? 0),
    0,
  );

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
          <h2>{email ? "생성된 랜딩페이지" : "로그인 후 생성된 랜딩페이지를 확인할 수 있습니다"}</h2>
        </div>

        {email ? (
          landings.length > 0 ? (
            <DashboardLandingList
              items={landings.map((landing) => {
                const metrics = landingMetrics.get(landing.id) ?? {
                  visitorCount: 0,
                  totalClickCount: 0,
                  formSubmissionCount: 0,
                };

                return {
                  id: landing.id,
                  title: landing.title,
                  createdAt: landing.createdAt,
                  typeLabel: getLandingTypeLabel(landing.type),
                  statusLabel: getLandingStatusLabel(landing.status),
                  publicSlug: landing.publicSlug,
                  description: landing.description,
                  visitorCount: metrics.visitorCount,
                  clickCount: metrics.totalClickCount,
                  isPublished: landing.status === "published",
                };
              })}
            />
          ) : (
            <div className="detail-card">
              <strong>아직 랜딩이 없습니다</strong>
              <p>첫 랜딩을 만든 뒤 방문, 클릭, 체류 데이터를 확인해보세요.</p>
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
