import { redirect } from "next/navigation";

import { CreateLandingForm } from "@/components/create-landing-form";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

export default async function NewLandingPage() {
  const auth = await getCurrentCreatorSessionSnapshot();

  if (!auth) {
    redirect("/login");
  }

  return <CreateLandingForm ownerEmail={auth.session.email} />;
}
