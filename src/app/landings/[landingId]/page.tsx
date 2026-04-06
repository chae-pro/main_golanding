import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LandingDetailContent } from "@/components/landing-detail-content";
import { LandingDetailFallback } from "@/components/landing-detail-fallback";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

type LandingDetailPageProps = {
  params: Promise<{ landingId: string }>;
};

export default async function LandingDetailPage({ params }: LandingDetailPageProps) {
  const auth = await getCurrentCreatorSessionSnapshot();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;

  return (
    <Suspense fallback={<LandingDetailFallback />}>
      <LandingDetailContent email={auth.session.email} landingId={landingId} />
    </Suspense>
  );
}
