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

function getRankStrength(rank: number, total: number, hasPositiveValue: boolean) {
  if (!hasPositiveValue) {
    return 0;
  }

  const clampedTotal = Math.max(total, 1);

  if (clampedTotal === 1) {
    return 1;
  }

  const linear = (clampedTotal - rank) / (clampedTotal - 1);

  return Math.pow(linear, 0.65);
}

function mixChannel(from: number, to: number, ratio: number) {
  return Math.round(from + (to - from) * ratio);
}

function getRankColor(rank: number, total: number, hasPositiveValue: boolean) {
  const mix = getRankStrength(rank, total, hasPositiveValue);

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
  const strength = getRankStrength(rank, total, hasPositiveValue);
  const color = getRankColor(rank, total, hasPositiveValue);
  const opacity = hasPositiveValue ? 0.18 + strength * 0.3 : 0.04;

  return {
    top: `${(index / 20) * 100}%`,
    height: `${100 / 20}%`,
    backgroundColor: `rgba(${color.red}, ${color.green}, ${color.blue}, ${opacity})`,
    boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, ${0.08 + strength * 0.14})`,
  };
}

function getDwellSummaryStyle(rank: number, total: number, hasPositiveValue: boolean) {
  const strength = getRankStrength(rank, total, hasPositiveValue);
  const color = getRankColor(rank, total, hasPositiveValue);

  return {
    backgroundColor: hasPositiveValue
      ? `rgb(${color.red}, ${color.green}, ${color.blue})`
      : "rgb(255, 255, 255)",
    borderColor: hasPositiveValue
      ? `rgba(${Math.max(color.red - 28, 0)}, ${Math.max(color.green - 8, 0)}, ${Math.max(
          color.blue - 6,
          0,
        )}, ${0.22 + strength * 0.28})`
      : "rgba(15, 23, 42, 0.08)",
    color: strength >= 0.52 ? "#ffffff" : "#7f1d1d",
    labelBackground: strength >= 0.52 ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 228, 230, 0.96)",
    labelColor: strength >= 0.52 ? "#ffffff" : "#7f1d1d",
    valueShadow: strength >= 0.52 ? "0 1px 0 rgba(0, 0, 0, 0.12)" : "0 1px 0 rgba(255, 255, 255, 0.25)",
  };
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
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="list-panel">
        <div className="section-heading">
          <h2>랜딩 체류 보기</h2>
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
              {visuals.dwellSections.map((value, index) => {
                const summaryStyle = getDwellSummaryStyle(
                  dwellRanks[index],
                  visuals.dwellSections.length,
                  value > 0 && highestDwellValue > 0,
                );

                return (
                  <div
                    className="analysis-section-summary-cell"
                    key={`${landing.id}-dwell-summary-${index + 1}`}
                    style={{
                      backgroundColor: summaryStyle.backgroundColor,
                      borderColor: summaryStyle.borderColor,
                      color: summaryStyle.color,
                    }}
                  >
                    <span
                      className="analysis-section-summary-label"
                      style={{
                        background: summaryStyle.labelBackground,
                        color: summaryStyle.labelColor,
                      }}
                    >
                      {index + 1}구간
                    </span>
                    <strong
                      className="analysis-section-summary-value"
                      style={{
                        color: summaryStyle.color,
                        textShadow: summaryStyle.valueShadow,
                      }}
                    >
                      {value}%
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
