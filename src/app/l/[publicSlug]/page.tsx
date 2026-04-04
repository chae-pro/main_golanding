import { notFound } from "next/navigation";

import { PublicLandingView } from "@/components/public-landing-view";
import { getLandingByPublicSlug } from "@/server/landing-service";

type PublicLandingPageProps = {
  params: Promise<{ publicSlug: string }>;
};

export default async function PublicLandingPage({ params }: PublicLandingPageProps) {
  const { publicSlug } = await params;
  const landing = await getLandingByPublicSlug(publicSlug);

  if (!landing || landing.status !== "published") {
    notFound();
  }

  return <PublicLandingView landing={landing} />;
}
