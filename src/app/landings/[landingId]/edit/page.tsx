import { notFound, redirect } from "next/navigation";

import { CreateLandingForm } from "@/components/create-landing-form";
import { getLandingById } from "@/server/landing-service";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

type EditLandingPageProps = {
  params: Promise<{ landingId: string }>;
};

export default async function EditLandingPage({ params }: EditLandingPageProps) {
  const auth = await getCurrentCreatorSessionSnapshot();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;
  const landing = await getLandingById(landingId);

  if (!landing) {
    notFound();
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    redirect("/landings/new");
  }

  return <CreateLandingForm initialLanding={landing} ownerEmail={auth.session.email} />;
}
