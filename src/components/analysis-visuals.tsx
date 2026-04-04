/* eslint-disable @next/next/no-img-element */

import type { Landing, LandingAnalysisVisuals } from "@/domain/types";

function getHeatmapPointClass(targetType: "page" | "cta" | "form") {
  if (targetType === "cta") {
    return "heatmap-point heatmap-point-cta";
  }

  if (targetType === "form") {
    return "heatmap-point heatmap-point-form";
  }

  return "heatmap-point";
}

function getDwellOverlayStyle(value: number, index: number) {
  const normalized = Math.min(Math.max(value / 100, 0), 1);
  const opacity = normalized > 0 ? 0.2 + normalized * 0.62 : 0.08;

  return {
    top: `${(index / 20) * 100}%`,
    height: `${100 / 20}%`,
    background: `linear-gradient(90deg, rgba(220, 38, 38, ${opacity}), rgba(249, 115, 22, ${Math.max(
      opacity * 0.86,
      0.1,
    )}))`,
  };
}

export function AnalysisVisuals({
  landing,
  visuals,
}: {
  landing: Landing;
  visuals: LandingAnalysisVisuals;
}) {
  return (
    <>
      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">체류 오버레이 + 클릭 히트맵</span>
          <h2>랜딩 이미지 오버레이</h2>
          <p>실제 랜딩 이미지 기준 20구간을 나누고, 구간별 체류 퍼센트를 바로 표시합니다.</p>
        </div>

        <div className="analysis-preview">
          <div className="analysis-preview-stack">
            {landing.images.map((image) => (
              <img
                alt={image.alt ?? landing.title}
                className="analysis-preview-image"
                key={image.id}
                src={image.src}
              />
            ))}

            <div className="analysis-section-overlay" aria-hidden="true">
              {visuals.dwellSections.map((value, index) => (
                <div
                  className="analysis-section-band"
                  key={`${landing.id}-dwell-overlay-${index + 1}`}
                  style={getDwellOverlayStyle(value, index)}
                >
                  <span className="analysis-section-badge analysis-section-label">
                    {index + 1}구간
                  </span>
                  <span className="analysis-section-badge analysis-section-value">{value}%</span>
                </div>
              ))}
            </div>

            {visuals.heatmapPoints.map((point) => (
              <span
                className={getHeatmapPointClass(point.targetType)}
                key={point.id}
                style={{
                  left: `${point.xRatio * 100}%`,
                  top: `${point.yRatio * 100}%`,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">구간별 체류 그래프</span>
          <h2>20구간 퍼센트 그래프</h2>
          <p>오버레이와 같은 기준의 구간별 체류 퍼센트를 막대 그래프로 보여줍니다.</p>
        </div>

        <div className="scroll-map-list">
          {visuals.scrollSections.map((section) => (
            <div className="scroll-map-row" key={section.section}>
              <strong>{section.section}구간</strong>
              <div className="scroll-map-track">
                <div className="scroll-map-fill" style={{ width: `${section.reachRate}%` }} />
              </div>
              <div className="scroll-map-meta">
                <span>{section.reachRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
