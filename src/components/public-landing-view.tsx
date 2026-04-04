"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

import type { Landing } from "@/domain/types";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function getPageMetrics() {
  const documentHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight, 1);
  const scrollableHeight = Math.max(documentHeight - window.innerHeight, 1);
  const scrollTop = window.scrollY;
  const scrollDepth = (scrollTop / scrollableHeight) * 100;
  const viewportTopRatio = scrollTop / documentHeight;
  const viewportBottomRatio = (scrollTop + window.innerHeight) / documentHeight;
  const midpoint = (viewportTopRatio + viewportBottomRatio) / 2;
  const sectionIndex = Math.min(Math.max(Math.floor(midpoint * 20) + 1, 1), 20);

  return {
    scrollDepth: Math.max(0, Math.min(scrollDepth, 100)),
    viewportTopRatio: Math.max(0, Math.min(viewportTopRatio, 1)),
    viewportBottomRatio: Math.max(0.0001, Math.min(viewportBottomRatio, 1)),
    sectionIndex,
  };
}

export function PublicLandingView({ landing }: { landing: Landing }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [submissionVersion, setSubmissionVersion] = useState(0);

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

    async function sendEvent(input: {
      eventType: "pageview" | "scroll" | "click" | "form_submit";
      sectionIndex: number;
      scrollDepth?: number;
      viewportTopRatio: number;
      viewportBottomRatio: number;
      xRatio?: number;
      yRatio?: number;
      targetType?: "page" | "cta" | "form";
      targetId?: string;
    }) {
      await fetch("/api/public/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
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
      }, 200);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const element = target?.closest("[data-golanding-target]") as HTMLElement | null;
      const pageHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight, 1);
      const xRatio = event.pageX / Math.max(window.innerWidth, 1);
      const yRatio = event.pageY / pageHeight;

      void sendEvent({
        eventType: "click",
        ...getPageMetrics(),
        xRatio,
        yRatio,
        targetType:
          (element?.dataset.golandingTarget as "page" | "cta" | "form" | undefined) ?? "page",
        targetId: element?.dataset.golandingTargetId ?? "page",
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("click", handleClick);
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
      <section className="public-landing-stack">
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
          <div className="section-heading">
            <span className="eyebrow">정보 입력</span>
            <h2>{landing.title}</h2>
            <p>{landing.description || "아래 항목을 입력하고 제출해주세요."}</p>
          </div>

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
