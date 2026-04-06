import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LandingAnalysisContent } from "@/components/landing-analysis-content";
import { LandingAnalysisFallback } from "@/components/landing-analysis-fallback";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

type AnalysisPageProps = {
  params: Promise<{ landingId: string }>;
};

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const auth = await getCurrentCreatorSessionSnapshot();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;

  return (
    <Suspense fallback={<LandingAnalysisFallback />}>
      <LandingAnalysisContent email={auth.session.email} landingId={landingId} />
    </Suspense>
  );
}
