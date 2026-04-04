import { notFound, redirect } from "next/navigation";

import { AnalysisVisuals } from "@/components/analysis-visuals";
import { getLandingAnalysisVisuals, getLandingMetrics } from "@/server/analytics-service";
import { getLandingById } from "@/server/landing-service";
import { getCurrentCreatorSession } from "@/server/session-auth";

type AnalysisPageProps = {
  params: Promise<{ landingId: string }>;
};

function getDwellColor(value: number) {
  const alpha = Math.min(Math.max(value / 100, 0.1), 1);
  return `rgba(37, 99, 235, ${alpha})`;
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
        <span className="eyebrow">Analysis</span>
        <h2>{landing.title}</h2>
        <p>Initial analytics scaffold for heatmap, scroll map, and normalized 20-section dwell map.</p>
      </div>

      <div className="metrics-grid">
        <div className="detail-card">
          <strong>{metrics?.visitorCount ?? 0}</strong>
          <p>Total visitors</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.totalClickCount ?? 0}</strong>
          <p>Total clicks</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.ctaClickCount ?? 0}</strong>
          <p>CTA clicks</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.formSubmissionCount ?? 0}</strong>
          <p>Form submissions</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.avgScrollDepth ?? 0}%</strong>
          <p>Average scroll depth</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.scrollCompletionRate ?? 0}%</strong>
          <p>Scroll completion rate</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.validDwellSessionCount ?? 0}</strong>
          <p>Valid dwell sessions</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.excludedDwellSessionCount ?? 0}</strong>
          <p>Excluded dwell sessions</p>
        </div>
      </div>

      {visuals ? <AnalysisVisuals landing={landing} visuals={visuals} /> : null}

      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">Dwell Map</span>
          <h2>20-section normalized view</h2>
          <p>Each section represents accumulated normalized dwell percent from valid sessions only.</p>
        </div>

        <div className="dwell-grid">
          {(metrics?.dwellSections ?? []).map((value, index) => (
            <div
              className="dwell-cell"
              key={`${landing.id}-${index + 1}`}
              style={{ background: getDwellColor(value) }}
            >
              <strong>Section {index + 1}</strong>
              <span>{value}%</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
