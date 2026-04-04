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
          <span className="eyebrow">클릭 히트맵</span>
          <h2>미리보기 오버레이</h2>
          <p>공개 랜딩에서 수집된 클릭 좌표를 랜딩 이미지 위에 표시합니다.</p>
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
          <span className="eyebrow">스크롤맵</span>
          <h2>20구간 도달률</h2>
          <p>각 막대는 해당 구간까지 도달한 세션 비율을 의미합니다.</p>
        </div>

        <div className="scroll-map-list">
          {visuals.scrollSections.map((section) => (
            <div className="scroll-map-row" key={section.section}>
              <strong>{section.section}구간</strong>
              <div className="scroll-map-track">
                <div
                  className="scroll-map-fill"
                  style={{ width: `${section.reachRate}%` }}
                />
              </div>
              <span>{section.reachRate}%</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
