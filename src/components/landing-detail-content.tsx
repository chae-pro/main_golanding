import { notFound, redirect } from "next/navigation";

import { AppLink } from "@/components/navigation-progress";
import { LandingStatusControls } from "@/components/landing-status-controls";
import { getLandingById } from "@/server/landing-service";

function getLandingTypeLabel(type: "button" | "form" | "html") {
  if (type === "button") {
    return "버튼형";
  }
  if (type === "form") {
    return "DB 수집형";
  }
  return "HTML 삽입형";
}

function getLandingStatusLabel(status: "draft" | "published" | "archived") {
  if (status === "published") {
    return "발행중";
  }
  return "사용중지";
}

export async function LandingDetailContent({
  landingId,
  email,
}: {
  landingId: string;
  email: string;
}) {
  const landing = await getLandingById(landingId);

  if (!landing) {
    notFound();
  }

  if (landing.ownerEmail.toLowerCase() !== email.toLowerCase()) {
    redirect("/");
  }

  return (
    <main className="panel detail-panel detail-panel-compact">
      <div className="section-heading detail-heading">
        <span className="eyebrow">랜딩 상세</span>
        <h2>{landing.title}</h2>
        <p>{landing.description || "아직 설명이 없습니다."}</p>
        <div className="link-row detail-actions">
          <AppLink className="ghost-button" href={`/landings/${landing.id}/edit`}>
            수정
          </AppLink>
          <AppLink className="ghost-button" href={`/landings/${landing.id}/submissions`}>
            DB확인하기
          </AppLink>
          <LandingStatusControls landingId={landing.id} currentStatus={landing.status} />
          <a className="ghost-button" href={`/api/landings/${landing.id}/submissions`} target="_blank">
            CSV 다운로드
          </a>
          {landing.status === "published" ? (
            <AppLink className="ghost-button" href={`/l/${landing.publicSlug}`} target="_blank">
              공개 페이지 열기
            </AppLink>
          ) : null}
        </div>
      </div>

      <div className="detail-grid detail-grid-compact">
        <div className="detail-card">
          <strong>{getLandingTypeLabel(landing.type)}</strong>
          <p>랜딩 유형</p>
        </div>
        <div className="detail-card">
          <strong>{getLandingStatusLabel(landing.status)}</strong>
          <p>상태</p>
        </div>
        <div className="detail-card">
          <strong>{landing.ownerEmail}</strong>
          <p>소유자 이메일</p>
        </div>
        <div className="detail-card">
          <strong>{landing.publicSlug}</strong>
          <p>공개 슬러그</p>
        </div>
      </div>

      <section className="list-panel detail-subpanel">
        <div className="section-heading detail-heading">
          <span className="eyebrow">공개 URL</span>
          <h2>/l/{landing.publicSlug}</h2>
          <p>
            {landing.status === "published"
              ? "현재 외부에서 접속할 수 있습니다."
              : "발행 후에만 외부 공개가 가능합니다."}
          </p>
        </div>
      </section>

      <section className="list-panel detail-subpanel">
        <div className="section-heading detail-heading">
          <span className="eyebrow">테마</span>
          <h2>시각 설정</h2>
        </div>

        <div className="detail-grid detail-grid-compact">
          <div className="detail-card">
            <strong>{landing.theme.primaryColor}</strong>
            <p>기본 색상</p>
          </div>
          <div className="detail-card">
            <strong>{landing.theme.textColor}</strong>
            <p>텍스트 색상</p>
          </div>
          <div className="detail-card">
            <strong>{landing.theme.surfaceColor}</strong>
            <p>배경 색상</p>
          </div>
          <div className="detail-card">
            <strong>{landing.theme.radius}px</strong>
            <p>모서리 둥글기</p>
          </div>
        </div>
      </section>
    </main>
  );
}
