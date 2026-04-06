import { Suspense } from "react";

import { HomeDashboardContent } from "@/components/home-dashboard-content";
import { HomeDashboardFallback } from "@/components/home-dashboard-fallback";
import { isAdminEmail } from "@/server/admin-auth";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

export default async function HomePage() {
  const auth = await getCurrentCreatorSessionSnapshot();
  const email = auth?.session.email ?? null;
  const adminAccess = email ? isAdminEmail(email) : false;

  return (
    <Suspense fallback={<HomeDashboardFallback />}>
      <HomeDashboardContent adminAccess={adminAccess} email={email} />
    </Suspense>
  );
}
