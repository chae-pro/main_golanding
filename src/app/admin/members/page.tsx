import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ApprovedAccountsManager } from "@/components/approved-accounts-manager";
import { CouponCodesManager } from "@/components/coupon-codes-manager";
import { SignupRequestsManager } from "@/components/signup-requests-manager";
import { listApprovedAccounts, listCouponCodes, listSignupRequests } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";

function SectionFallback({ title }: { title: string }) {
  return (
    <section className="panel list-panel loading-panel">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>

      <div className="admin-line-list">
        {Array.from({ length: 2 }).map((_, index) => (
          <div className="admin-line-row loading-row" key={index}>
            <div className="loading-line loading-line-medium" />
            <div className="loading-line loading-line-short" />
            <div className="loading-line loading-line-short" />
            <div className="loading-line loading-line-short" />
            <div className="loading-pill" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function CouponsSection() {
  const coupons = await listCouponCodes();
  return <CouponCodesManager initialCoupons={coupons} />;
}

async function SignupRequestsSection() {
  const signupRequests = await listSignupRequests();
  return <SignupRequestsManager initialSignupRequests={signupRequests} />;
}

async function ApprovedAccountsSection({
  currentSessionId,
}: {
  currentSessionId: string;
}) {
  const accounts = await listApprovedAccounts();

  return (
    <ApprovedAccountsManager
      currentSessionId={currentSessionId}
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
  );
}

export default async function AdminMembersPage() {
  let auth;

  try {
    auth = await requireAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    redirect(message === "UNAUTHORIZED" ? "/login" : "/");
  }

  return (
    <>
      <Suspense fallback={<SectionFallback title="쿠폰 관리" />}>
        <CouponsSection />
      </Suspense>

      <Suspense fallback={<SectionFallback title="가입 신청 관리" />}>
        <SignupRequestsSection />
      </Suspense>

      <Suspense fallback={<SectionFallback title="승인 계정" />}>
        <ApprovedAccountsSection currentSessionId={auth.session.id} />
      </Suspense>
    </>
  );
}
