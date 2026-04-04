import { redirect } from "next/navigation";

import { CreateLandingForm } from "@/components/create-landing-form";
import { getCurrentCreatorSession } from "@/server/session-auth";

export default async function NewLandingPage() {
  const auth = await getCurrentCreatorSession();

  if (!auth) {
    redirect("/login");
  }

  return <CreateLandingForm ownerEmail={auth.session.email} />;
}
