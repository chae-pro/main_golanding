import { notFound, redirect } from "next/navigation";

import { CreateLandingForm } from "@/components/create-landing-form";
import { getLandingById } from "@/server/landing-service";

export async function LandingEditContent({
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
    redirect("/landings/new");
  }

  return <CreateLandingForm initialLanding={landing} ownerEmail={email} />;
}
