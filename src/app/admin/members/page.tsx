import { redirect } from "next/navigation";

import { ApprovedAccountsManager } from "@/components/approved-accounts-manager";
import { CouponCodesManager } from "@/components/coupon-codes-manager";
import { SignupRequestsManager } from "@/components/signup-requests-manager";
import { listApprovedAccounts, listCouponCodes, listSignupRequests } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

export default async function AdminMembersPage() {
  let auth;

  try {
    auth = await requireAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    redirect(message === "UNAUTHORIZED" ? "/login" : "/");
  }

  const [accounts, signupRequests, coupons] = await Promise.all([
    listApprovedAccounts(),
    listSignupRequests(),
    listCouponCodes(),
  ]);

  return (
    <>
      <CouponCodesManager initialCoupons={coupons} />
      <SignupRequestsManager initialSignupRequests={signupRequests} />
      <ApprovedAccountsManager
        currentSessionId={auth.session.id}
        initialAccounts={accounts}
        initialOverview={{
          approvedAccountCount: 0,
          activeSessionCount: 0,
          publishedLandingCount: 0,
          totalLandingCount: 0,
          recentVisitorCount: 0,
          recentFormSubmissionCount: 0,
        }}
        initialReadiness={{
          environment: "production",
          dbProvider: "",
          storageProvider: "",
          overallStatus: "pass",
          checks: [],
        }}
        initialSessions={[]}
        variant="accounts-only"
      />
    </>
  );
}
