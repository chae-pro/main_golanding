import { redirect } from "next/navigation";

import { ApprovedAccountsManager } from "@/components/approved-accounts-manager";
import { CouponCodesManager } from "@/components/coupon-codes-manager";
import { SignupRequestsManager } from "@/components/signup-requests-manager";
import {
  listActiveSessions,
  listApprovedAccounts,
  listCouponCodes,
  listSignupRequests,
} from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";
import { getAdminOverviewMetrics } from "@/server/admin-dashboard-service";
import { getDeploymentReadiness } from "@/server/deployment-readiness-service";

export default async function AdminAccountsPage() {
  let auth;

  try {
    auth = await requireAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    redirect(message === "UNAUTHORIZED" ? "/login" : "/");
  }

  const [accounts, overview, sessions, signupRequests, coupons] = await Promise.all([
    listApprovedAccounts(),
    getAdminOverviewMetrics(),
    listActiveSessions(),
    listSignupRequests(),
    listCouponCodes(),
  ]);
  const readiness = await getDeploymentReadiness({
    approvedAccountCount: accounts.length,
  });

  return (
    <>
      <CouponCodesManager initialCoupons={coupons} />
      <SignupRequestsManager initialSignupRequests={signupRequests} />
      <ApprovedAccountsManager
        currentSessionId={auth.session.id}
        initialAccounts={accounts}
        initialOverview={overview}
        initialReadiness={readiness}
        initialSessions={sessions}
      />
    </>
  );
}
