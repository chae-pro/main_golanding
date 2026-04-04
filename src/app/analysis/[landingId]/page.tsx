import { notFound, redirect } from "next/navigation";

import { AnalysisVisuals } from "@/components/analysis-visuals";
import { AnalyticsResetButton } from "@/components/analytics-reset-button";
import {
  getLandingAnalysisVisuals,
  getLandingMetrics,
  getLandingSessionDebugRows,
} from "@/server/analytics-service";
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

  if (!landing) {
    notFound();
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    redirect("/");
  }

  const [metrics, visuals, debugRows] = await Promise.all([
    getLandingMetrics(landing.id),
    getLandingAnalysisVisuals(landing.id),
    getLandingSessionDebugRows(landing.id),
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
          <p>CTA 클릭 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.formSubmissionCount}</strong>
          <p>폼 제출 수</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.avgScrollDepth}%</strong>
          <p>평균 스크롤 깊이</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.scrollCompletionRate}%</strong>
          <p>20구간 도달 세션 비율</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.validDwellSessionCount}</strong>
          <p>체류 계산 세션</p>
        </div>
        <div className="detail-card">
          <strong>{metrics.excludedDwellSessionCount}</strong>
          <p>제외 세션</p>
        </div>
      </div>

      <AnalysisVisuals landing={landing} visuals={visuals} />

      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">정규화 체류맵</span>
          <h2>20구간 정규화 보기</h2>
          <p>보정 없이 누적한 체류 시간을 각 세션 100% 기준으로 정규화한 평균 비율입니다.</p>
        </div>

        <div className="dwell-grid">
          {metrics.dwellSections.map((value, index) => (
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

      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">원본 세션 확인</span>
          <h2>최근 체류 세션 원본</h2>
          <p>최근 세션별로 실제로 어느 구간에 몇 ms가 쌓였는지 바로 확인할 수 있습니다.</p>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>세션</th>
                <th>시작 시각</th>
                <th>마지막 활동</th>
                <th>총 체류 ms</th>
                <th>최대 구간</th>
                <th>상위 구간</th>
              </tr>
            </thead>
            <tbody>
              {debugRows.length > 0 ? (
                debugRows.map((row) => (
                  <tr key={row.sessionId}>
                    <td>{row.sessionId.slice(0, 8)}</td>
                    <td>{new Date(row.startedAt).toLocaleString("ko-KR")}</td>
                    <td>{new Date(row.lastActivityAt).toLocaleString("ko-KR")}</td>
                    <td>{Math.round(row.validDwellMs)}</td>
                    <td>{row.maxVisibleSectionIndex}구간</td>
                    <td>
                      {row.topSections.length > 0
                        ? row.topSections
                            .map(
                              (item) =>
                                `${item.section}구간 ${item.percent}% (${Math.round(item.ms)}ms)`,
                            )
                            .join(", ")
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>아직 체류 세션 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
