import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LandingEditContent } from "@/components/landing-edit-content";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

type EditLandingPageProps = {
  params: Promise<{ landingId: string }>;
};

function EditLandingFallback() {
  return (
    <main className="panel detail-panel detail-panel-compact">
      <div className="section-heading detail-heading">
        <span className="eyebrow">랜딩 편집기</span>
        <h2>불러오는 중...</h2>
        <p>랜딩 편집 화면을 준비하고 있습니다.</p>
      </div>
    </main>
  );
}

export default async function EditLandingPage({ params }: EditLandingPageProps) {
  const auth = await getCurrentCreatorSessionSnapshot();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;

  return (
    <Suspense fallback={<EditLandingFallback />}>
      <LandingEditContent email={auth.session.email} landingId={landingId} />
    </Suspense>
  );
}
