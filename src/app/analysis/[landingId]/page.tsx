import { notFound, redirect } from "next/navigation";

import { AnalysisVisuals } from "@/components/analysis-visuals";
import { getLandingAnalysisVisuals, getLandingMetrics } from "@/server/analytics-service";
import { getLandingById } from "@/server/landing-service";
import { getCurrentCreatorSession } from "@/server/session-auth";

type AnalysisPageProps = {
  params: Promise<{ landingId: string }>;
};

function getDwellColor(value: number) {
  const alpha = Math.min(Math.max(value / 100, 0.08), 0.72);
  return `linear-gradient(135deg, rgba(239, 68, 68, ${alpha}), rgba(249, 115, 22, ${Math.max(
    alpha * 0.8,
    0.06,
  )}))`;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const auth = await getCurrentCreatorSession();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;
  const landing = await getLandingById(landingId);
  const [metrics, visuals] = landing
    ? await Promise.all([getLandingMetrics(landing.id), getLandingAnalysisVisuals(landing.id)])
    : [null, null];

  if (!landing) {
    notFound();
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    redirect("/");
  }

  return (
    <main className="panel detail-panel">
      <div className="section-heading">
        <span className="eyebrow">분석</span>
        <h2>{landing.title}</h2>
        <p>클릭 히트맵, 스크롤맵, 20구간 체류맵을 한 화면에서 확인할 수 있습니다.</p>
      </div>

      <div className="metrics-grid">
        <div className="detail-card">
          <strong>{metrics?.visitorCount ?? 0}</strong>
          <p>총 방문자</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.totalClickCount ?? 0}</strong>
          <p>총 클릭 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.ctaClickCount ?? 0}</strong>
          <p>CTA 클릭 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.formSubmissionCount ?? 0}</strong>
          <p>폼 제출 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.avgScrollDepth ?? 0}%</strong>
          <p>평균 스크롤 깊이</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.scrollCompletionRate ?? 0}%</strong>
          <p>20구간 도달 세션 비율</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.validDwellSessionCount ?? 0}</strong>
          <p>유효 체류 세션</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.excludedDwellSessionCount ?? 0}</strong>
          <p>제외된 세션</p>
        </div>
      </div>

      {visuals ? <AnalysisVisuals landing={landing} visuals={visuals} /> : null}

      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">정규화 체류맵</span>
          <h2>20구간 정규화 보기</h2>
          <p>각 세션을 100%로 정규화한 뒤 평균한 체류 비율입니다. 합계는 100% 근처가 됩니다.</p>
        </div>

        <div className="dwell-grid">
          {(metrics?.dwellSections ?? []).map((value, index) => (
            <div
              className="dwell-cell"
              key={`${landing.id}-${index + 1}`}
              style={{ background: getDwellColor(value) }}
            >
              <strong>{index + 1}구간</strong>
              <span>{value}%</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
