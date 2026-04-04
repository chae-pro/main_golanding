import { redirect } from "next/navigation";

import { ActivateForm } from "@/components/activate-form";
import { getCurrentCreatorSession } from "@/server/session-auth";

export default async function LoginPage() {
  const auth = await getCurrentCreatorSession();

  if (auth) {
    redirect("/");
  }

  return <ActivateForm />;
}
