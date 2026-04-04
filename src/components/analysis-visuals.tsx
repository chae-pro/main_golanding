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

function getRankOpacity(rank: number, total: number, hasPositiveValue: boolean) {
  if (!hasPositiveValue) {
    return 0.06;
  }

  const clampedTotal = Math.max(total, 1);
  const normalized = clampedTotal === 1 ? 1 : (clampedTotal - rank) / (clampedTotal - 1);

  return 0.08 + normalized * 0.42;
}

function getRankMix(rank: number, total: number, hasPositiveValue: boolean) {
  if (!hasPositiveValue) {
    return 0;
  }

  const clampedTotal = Math.max(total, 1);

  if (clampedTotal === 1) {
    return 1;
  }

  return (clampedTotal - rank) / (clampedTotal - 1);
}

function mixChannel(from: number, to: number, ratio: number) {
  return Math.round(from + (to - from) * ratio);
}

function getRankColor(rank: number, total: number, hasPositiveValue: boolean) {
  const mix = getRankMix(rank, total, hasPositiveValue);

  return {
    red: mixChannel(255, 178, mix),
    green: mixChannel(255, 14, mix),
    blue: mixChannel(255, 4, mix),
  };
}

function getDwellRanks(values: number[]) {
  const sorted = [...values].sort((left, right) => right - left);

  return values.map((value) => {
    let lastIndex = sorted.length - 1;

    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      if (sorted[index] === value) {
        lastIndex = index;
        break;
      }
    }

    return lastIndex + 1;
  });
}

function getDwellOverlayStyle(rank: number, total: number, hasPositiveValue: boolean, index: number) {
  const opacity = getRankOpacity(rank, total, hasPositiveValue);
  const color = getRankColor(rank, total, hasPositiveValue);

  return {
    top: `${(index / 20) * 100}%`,
    height: `${100 / 20}%`,
    background: `linear-gradient(90deg,
      rgba(${color.red}, ${color.green}, ${color.blue}, ${opacity}),
      rgba(${color.red}, ${color.green}, ${color.blue}, ${Math.max(opacity * 0.82, 0.14)}) 62%,
      rgba(${color.red}, ${color.green}, ${color.blue}, ${Math.max(opacity * 0.62, 0.1)}) 100%)`,
    boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, ${Math.max(opacity * 0.22, 0.08)})`,
  };
}

function getDwellSummaryStyle(rank: number, total: number, hasPositiveValue: boolean) {
  const opacity = getRankOpacity(rank, total, hasPositiveValue);
  const color = getRankColor(rank, total, hasPositiveValue);

  return {
    background: `linear-gradient(135deg,
      rgba(255, 255, 255, ${Math.max(opacity * 0.72, 0.16)}),
      rgba(${color.red}, ${color.green}, ${color.blue}, ${Math.max(opacity * 0.92, 0.18)}))`,
    borderColor: `rgba(255, 255, 255, ${Math.max(opacity * 0.58, 0.2)})`,
  };
}

function formatSeconds(value: number) {
  return `${value.toFixed(1)}초`;
}

export function AnalysisVisuals({
  landing,
  visuals,
}: {
  landing: Landing;
  visuals: LandingAnalysisVisuals;
}) {
  const dwellRanks = getDwellRanks(visuals.dwellSections);
  const highestDwellValue = Math.max(...visuals.dwellSections, 0);

  return (
    <>
      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">체류 오버레이 + 클릭 히트맵</span>
          <h2>랜딩 체류 보기</h2>
          <p>실제 랜딩 이미지 기준 20구간을 나누고, 구간별 체류 퍼센트를 바로 표시합니다.</p>
        </div>

        <div className="analysis-preview">
          <div className="analysis-preview-layout">
            <div className="analysis-preview-stage">
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
                      style={getDwellOverlayStyle(
                        dwellRanks[index],
                        visuals.dwellSections.length,
                        value > 0 && highestDwellValue > 0,
                        index,
                      )}
                    >
                      <span className="analysis-section-badge analysis-section-label">
                        {index + 1}구간
                      </span>
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

            <div className="analysis-section-summary" aria-hidden="true">
              {visuals.dwellSections.map((value, index) => (
                <div
                  className="analysis-section-summary-cell"
                  key={`${landing.id}-dwell-summary-${index + 1}`}
                  style={getDwellSummaryStyle(
                    dwellRanks[index],
                    visuals.dwellSections.length,
                    value > 0 && highestDwellValue > 0,
                  )}
                >
                  <span className="analysis-section-summary-label">{index + 1}구간</span>
                  <strong className="analysis-section-summary-value">{value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="list-panel">
        <div className="section-heading">
          <h2>구간별 체류그래프</h2>
        </div>

        <div className="scroll-map-list">
          {visuals.scrollSections.map((section) => (
            <div className="scroll-map-row" key={section.section}>
              <strong>{section.section}구간</strong>
              <div className="scroll-map-track">
                <div className="scroll-map-fill" style={{ width: `${section.reachRate}%` }} />
              </div>
              <div className="scroll-map-meta">
                <span className="scroll-map-meta-label">비율</span>
                <span className="scroll-map-meta-value">{section.reachRate}%</span>
                <span className="scroll-map-meta-label">시간</span>
                <span className="scroll-map-meta-value">{formatSeconds(section.avgDwellSeconds)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
