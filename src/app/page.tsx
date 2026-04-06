import { HomeDashboardContent } from "@/components/home-dashboard-content";
import { isAdminEmail } from "@/server/admin-auth";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

export default async function HomePage() {
  const auth = await getCurrentCreatorSessionSnapshot();
  const email = auth?.session.email ?? null;
  const adminAccess = email ? isAdminEmail(email) : false;

  return <HomeDashboardContent adminAccess={adminAccess} email={email} />;
}
