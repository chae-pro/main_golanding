import { notFound, redirect } from "next/navigation";

import { AnalysisVisuals } from "@/components/analysis-visuals";
import { AnalyticsResetButton } from "@/components/analytics-reset-button";
import { getLandingAnalysisVisuals, getLandingMetrics } from "@/server/analytics-service";
import { getLandingById } from "@/server/landing-service";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

type AnalysisPageProps = {
  params: Promise<{ landingId: string }>;
};

function formatSeconds(value: number) {
  return `${value.toFixed(1)}초`;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const auth = await getCurrentCreatorSessionSnapshot();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;
  const landing = await getLandingById(landingId);

  if (!landing) {
    notFound();
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    redirect("/");
  }

  const [metrics, visuals] = await Promise.all([
    getLandingMetrics(landing.id),
    getLandingAnalysisVisuals(landing.id),
  ]);

  return (
    <main className="panel detail-panel">
      <div className="section-heading">
        <span className="eyebrow">분석</span>
        <h2>{landing.title}</h2>
        <p>클릭 히트맵, 체류 오버레이, 구간별 체류 퍼센트를 한 화면에서 확인할 수 있습니다.</p>
        <AnalyticsResetButton landingId={landing.id} />
      </div>

      <div className="metrics-grid">
        <div className="detail-card">
          <strong>{metrics.visitorCount}</strong>
          <p>총 방문자</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.totalClickCount}</strong>
          <p>총 클릭 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.ctaClickCount}</strong>
          <p>버튼 클릭 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.formSubmissionCount}</strong>
          <p>폼 제출 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.avgScrollDepth}%</strong>
          <p>평균 본 깊이</p>
        </div>
        <div className="detail-card">
          <strong>{formatSeconds(metrics.avgDwellSeconds)}</strong>
          <p>평균 머문 시간</p>
        </div>
      </div>

      <AnalysisVisuals landing={landing} visuals={visuals} />
    </main>
  );
}
