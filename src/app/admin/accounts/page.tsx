import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ApprovedAccountsManager } from "@/components/approved-accounts-manager";
import { listActiveSessions, listApprovedAccounts } from "@/server/access-service";
import { requireAdminSession } from "@/server/admin-auth";
import { getAdminOverviewMetrics } from "@/server/admin-dashboard-service";
import { getDeploymentReadiness } from "@/server/deployment-readiness-service";

function AdminAccountsFallback() {
  return (
    <section className="panel list-panel loading-panel">
      <div className="section-heading">
        <h2>관리자</h2>
      </div>
      <div className="admin-line-list">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="admin-line-row loading-row" key={index}>
            <div className="loading-line loading-line-medium" />
            <div className="loading-line loading-line-short" />
            <div className="loading-line loading-line-short" />
            <div className="loading-pill" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function AdminAccountsContent({ currentSessionId }: { currentSessionId: string }) {
  const [accounts, overview, sessions] = await Promise.all([
    listApprovedAccounts(),
    getAdminOverviewMetrics(),
    listActiveSessions(),
  ]);
  const readiness = await getDeploymentReadiness({
    approvedAccountCount: accounts.length,
  });

  return (
    <ApprovedAccountsManager
      currentSessionId={currentSessionId}
      initialAccounts={accounts}
      initialOverview={overview}
      initialReadiness={readiness}
      initialSessions={sessions}
      variant="admin-only"
    />
  );
}

export default async function AdminAccountsPage() {
  let currentSessionId = "";

  try {
    const auth = await requireAdminSession();
    currentSessionId = auth.session.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    redirect(message === "UNAUTHORIZED" ? "/login" : "/");
  }

  return (
    <Suspense fallback={<AdminAccountsFallback />}>
      <AdminAccountsContent currentSessionId={currentSessionId} />
    </Suspense>
  );
}
