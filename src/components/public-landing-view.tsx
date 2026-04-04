"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

import type { Landing } from "@/domain/types";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const HEARTBEAT_INTERVAL_MS = 750;

function getTrackedAreaMetrics(target: HTMLElement | null) {
  const fallback = {
    scrollDepth: 0,
    viewportTopRatio: 0,
    viewportBottomRatio: 0,
    sectionIndex: 1,
  };

  if (!target) {
    return fallback;
  }

  const rect = target.getBoundingClientRect();
  const areaTop = rect.top + window.scrollY;
  const areaBottom = rect.bottom + window.scrollY;
  const areaHeight = Math.max(rect.height, 1);
  const viewportTop = window.scrollY;
  const viewportBottom = window.scrollY + window.innerHeight;

  const visibleTop = Math.max(viewportTop, areaTop);
  const visibleBottom = Math.min(viewportBottom, areaBottom);
  const hasVisibleArea = visibleBottom > visibleTop;

  const viewportTopRatio = hasVisibleArea ? (visibleTop - areaTop) / areaHeight : 0;
  const viewportBottomRatio = hasVisibleArea ? (visibleBottom - areaTop) / areaHeight : 0;
  const midpoint = hasVisibleArea ? (viewportTopRatio + viewportBottomRatio) / 2 : 0;
  const sectionIndex = hasVisibleArea
    ? Math.min(Math.max(Math.floor(midpoint * 20) + 1, 1), 20)
    : 1;

  const totalScrollableInsideArea = Math.max(areaHeight - window.innerHeight, 1);
  const relativeScrollTop = Math.max(0, Math.min(viewportTop - areaTop, totalScrollableInsideArea));
  const scrollDepth = hasVisibleArea ? (relativeScrollTop / totalScrollableInsideArea) * 100 : 0;

  return {
    scrollDepth: Math.max(0, Math.min(scrollDepth, 100)),
    viewportTopRatio: Math.max(0, Math.min(viewportTopRatio, 1)),
    viewportBottomRatio: Math.max(0, Math.min(viewportBottomRatio, 1)),
    sectionIndex,
  };
}

export function PublicLandingView({ landing }: { landing: Landing }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionVersion, setSubmissionVersion] = useState(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const trackAreaRef = useRef<HTMLElement | null>(null);

  const orderedImages = useMemo(
    () => [...landing.images].sort((a, b) => a.sortOrder - b.sortOrder),
    [landing.images],
  );
  const orderedButtons = useMemo(
    () => [...landing.buttons].sort((a, b) => a.sortOrder - b.sortOrder),
    [landing.buttons],
  );
  const orderedFormFields = useMemo(
    () => [...landing.formFields].sort((a, b) => a.sortOrder - b.sortOrder),
    [landing.formFields],
  );

  function getPageMetrics() {
    return getTrackedAreaMetrics(trackAreaRef.current);
  }

  useEffect(() => {
    let isMounted = true;

    async function startSession() {
      const metrics = getPageMetrics();
      const response = await fetch("/api/public/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          landingId: landing.id,
          sectionIndex: metrics.sectionIndex,
          scrollDepth: metrics.scrollDepth,
          viewportTopRatio: metrics.viewportTopRatio,
          viewportBottomRatio: metrics.viewportBottomRatio,
        }),
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as { session?: { id: string } };
      if (isMounted && result.session?.id) {
        setSessionId(result.session.id);
      }
    }

    void startSession();

    return () => {
      isMounted = false;
    };
  }, [landing.id]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    async function sendEvent(
      input: {
        eventType: "pageview" | "scroll" | "click" | "form_submit" | "activity";
        sectionIndex: number;
        scrollDepth?: number;
        viewportTopRatio: number;
        viewportBottomRatio: number;
        xRatio?: number;
        yRatio?: number;
        targetType?: "page" | "cta" | "form";
        targetId?: string;
      },
      options?: { keepalive?: boolean },
    ) {
      await fetch("/api/public/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        keepalive: options?.keepalive ?? false,
        body: JSON.stringify({
          landingId: landing.id,
          sessionId,
          ...input,
        }),
      });
    }

    void sendEvent({
      eventType: "pageview",
      ...getPageMetrics(),
      targetType: "page",
      targetId: "initial-view",
    });

    const heartbeatId = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void sendEvent({
        eventType: "activity",
        ...getPageMetrics(),
        targetType: "page",
        targetId: "heartbeat",
      });
    }, HEARTBEAT_INTERVAL_MS);

    const handleScroll = () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = window.setTimeout(() => {
        void sendEvent({
          eventType: "scroll",
          ...getPageMetrics(),
          targetType: "page",
          targetId: "scroll",
        });
      }, 100);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const element = target?.closest("[data-golanding-target]") as HTMLElement | null;
      const trackedRect = trackAreaRef.current?.getBoundingClientRect();
      const trackedTop = trackedRect ? trackedRect.top + window.scrollY : 0;
      const trackedHeight = Math.max(trackedRect?.height ?? 1, 1);
      const xRatio = event.clientX / Math.max(window.innerWidth, 1);
      const yRatio = trackedRect ? (event.pageY - trackedTop) / trackedHeight : 0;

      void sendEvent({
        eventType: "click",
        ...getPageMetrics(),
        xRatio: Math.max(0, Math.min(xRatio, 1)),
        yRatio: Math.max(0, Math.min(yRatio, 1)),
        targetType:
          (element?.dataset.golandingTarget as "page" | "cta" | "form" | undefined) ?? "page",
        targetId: element?.dataset.golandingTargetId ?? "page",
      });
    };

    const handlePageHide = () => {
      void sendEvent(
        {
          eventType: "activity",
          ...getPageMetrics(),
          targetType: "page",
          targetId: "pagehide",
        },
        { keepalive: true },
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void sendEvent(
          {
            eventType: "activity",
            ...getPageMetrics(),
            targetType: "page",
            targetId: "visibility-hidden",
          },
          { keepalive: true },
        );
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("click", handleClick);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeatId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [landing.id, sessionId]);

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = orderedFormFields.map((field) => ({
      fieldKey: field.fieldKey,
      label: field.label,
      value: String(formData.get(field.fieldKey) ?? ""),
    }));

    setSubmitState({ status: "idle" });
    setIsSubmitting(true);

    try {
      const metrics = getPageMetrics();
      const response = await fetch("/api/public/form-submissions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          landingId: landing.id,
          sessionId,
          sectionIndex: metrics.sectionIndex,
          scrollDepth: metrics.scrollDepth,
          viewportTopRatio: metrics.viewportTopRatio,
          viewportBottomRatio: metrics.viewportBottomRatio,
          values,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "제출에 실패했습니다.");
      }

      setSubmitState({ status: "success", message: "정상적으로 제출되었습니다." });
      setSubmissionVersion((value) => value + 1);
      form.reset();
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "제출에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-landing-shell">
      <section className="public-landing-stack" ref={trackAreaRef}>
        {orderedImages.map((image) => (
          <img
            alt={image.alt ?? landing.title}
            className="public-landing-image"
            key={`${landing.id}-${image.id}`}
            src={image.src}
          />
        ))}
      </section>

      {landing.type === "button" ? (
        <section
          className="public-cta-panel"
          id="cta-panel"
          style={{
            backgroundColor: landing.theme.surfaceColor,
            color: landing.theme.textColor,
            borderRadius: `${landing.theme.radius}px`,
          }}
        >
          <div className="section-heading">
            <span className="eyebrow">버튼 영역</span>
            <h2>{landing.title}</h2>
            <p>{landing.description || "아래 버튼을 눌러 다음 단계로 이동해보세요."}</p>
          </div>

          <div className="public-cta-grid">
            {orderedButtons.map((button) => (
              <a
                className="public-cta-button"
                data-golanding-target="cta"
                data-golanding-target-id={button.id}
                href={button.href}
                key={button.id}
                style={{
                  backgroundColor: landing.theme.primaryColor,
                  color: "#ffffff",
                  borderRadius: `${landing.theme.radius}px`,
                  flex: button.widthRatio,
                }}
              >
                {button.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {landing.type === "form" ? (
        <section
          className="public-form-panel"
          id="lead-form-panel"
          style={{
            backgroundColor: landing.theme.surfaceColor,
            color: landing.theme.textColor,
            borderRadius: `${landing.theme.radius}px`,
          }}
        >
          <form className="public-form-grid" key={submissionVersion} onSubmit={handleFormSubmit}>
            {orderedFormFields.map((field) => (
              <label data-golanding-target="form" data-golanding-target-id={field.id} key={field.id}>
                {field.label}
                <input
                  data-golanding-target="form"
                  data-golanding-target-id={field.id}
                  name={field.fieldKey}
                  placeholder={field.placeholder}
                  required={field.required}
                  type="text"
                />
              </label>
            ))}

            <button
              className="public-cta-button"
              data-golanding-target="form"
              data-golanding-target-id="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: landing.theme.primaryColor,
                color: "#ffffff",
                borderRadius: `${landing.theme.radius}px`,
              }}
              type="submit"
            >
              {isSubmitting ? "제출 중..." : "제출하기"}
            </button>
          </form>

          {submitState.status !== "idle" ? (
            <p className={submitState.status === "success" ? "status-success" : "status-error"}>
              {submitState.message}
            </p>
          ) : null}
        </section>
      ) : null}

      {landing.type === "html" && landing.htmlSource ? (
        <section
          className="public-html-panel"
          dangerouslySetInnerHTML={{ __html: landing.htmlSource.htmlSource }}
        />
      ) : null}

      {landing.type === "button" && orderedButtons.length > 0 ? (
        <div
          className="public-mobile-dock"
          style={{
            backgroundColor: landing.theme.surfaceColor,
            color: landing.theme.textColor,
          }}
        >
          <div className="public-mobile-dock-meta">
            <strong>{landing.title}</strong>
            <span>다시 올라가지 않아도 바로 버튼을 누를 수 있습니다.</span>
          </div>
          <div className="public-mobile-dock-actions">
            {orderedButtons.map((button) => (
              <a
                className="public-mobile-dock-button"
                data-golanding-target="cta"
                data-golanding-target-id={`mobile-${button.id}`}
                href={button.href}
                key={`mobile-${button.id}`}
                style={{
                  backgroundColor: landing.theme.primaryColor,
                  color: "#ffffff",
                  borderRadius: `${landing.theme.radius}px`,
                }}
              >
                {button.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {landing.type === "form" ? (
        <div
          className="public-mobile-dock"
          style={{
            backgroundColor: landing.theme.surfaceColor,
            color: landing.theme.textColor,
          }}
        >
          <div className="public-mobile-dock-meta">
            <strong>{landing.title}</strong>
            <span>입력 영역으로 바로 이동할 수 있습니다.</span>
          </div>
          <div className="public-mobile-dock-actions">
            <a
              className="public-mobile-dock-button"
              data-golanding-target="form"
              data-golanding-target-id="mobile-form-jump"
              href="#lead-form-panel"
              style={{
                backgroundColor: landing.theme.primaryColor,
                color: "#ffffff",
                borderRadius: `${landing.theme.radius}px`,
              }}
            >
              입력하러 가기
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}
