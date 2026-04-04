import Link from "next/link";

import { getLandingMetrics } from "@/server/analytics-service";
import { isAdminEmail } from "@/server/admin-auth";
import { listLandingsByOwner } from "@/server/landing-service";
import { getCurrentCreatorSession } from "@/server/session-auth";

export default async function HomePage() {
  const auth = await getCurrentCreatorSession();
  const adminAccess = auth ? isAdminEmail(auth.session.email) : false;
  const landings = auth ? await listLandingsByOwner(auth.session.email) : [];
  const landingMetrics = await Promise.all(
    landings.map(async (landing) => ({
      landing,
      metrics: await getLandingMetrics(landing.id),
    })),
  );
  const totalVisitors = landingMetrics.reduce((sum, item) => sum + item.metrics.visitorCount, 0);
  const totalClicks = landingMetrics.reduce((sum, item) => sum + item.metrics.totalClickCount, 0);
  const totalForms = landingMetrics.reduce(
    (sum, item) => sum + item.metrics.formSubmissionCount,
    0,
  );
  const totalValidDwell = landingMetrics.reduce(
    (sum, item) => sum + item.metrics.validDwellSessionCount,
    0,
  );

  return (
    <main>
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">Waterfall Build</span>
          <h2>Scaffold the first working Golanding baseline.</h2>
          <p>
            This build already includes SaaS login, landing draft creation, landing listing, and a
            first analytics view for click, scroll, and normalized 20-section dwell data.
          </p>
          <div className="link-row">
            <Link className="primary-button" href={auth ? "/landings/new" : "/login"}>
              {auth ? "Create first draft" : "Sign in"}
            </Link>
            {adminAccess ? (
              <Link className="ghost-button" href="/admin/accounts">
                Manage Access
              </Link>
            ) : null}
            {auth ? null : (
              <span className="session-chip">Approved email required for creator access</span>
            )}
          </div>
        </div>

        <div className="panel hero-side">
          <div className="hero-metrics">
            <div className="metric-card">
              <strong>{landings.length}</strong>
              <p>Draft landings</p>
            </div>
            <div className="metric-card">
              <strong>{totalVisitors}</strong>
              <p>Total visitors</p>
            </div>
            <div className="metric-card">
              <strong>{totalClicks}</strong>
              <p>Total clicks</p>
            </div>
            <div className="metric-card">
              <strong>{totalForms}</strong>
              <p>Form submissions</p>
            </div>
            <div className="metric-card">
              <strong>{totalValidDwell}</strong>
              <p>Valid dwell sessions</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">Landings</span>
          <h2>{auth ? "Your landings" : "Sign in to view your landings"}</h2>
          <p>
            {auth
              ? "Creator dashboard is filtered to the signed-in owner."
              : "Landing management and analytics are hidden until login."}
          </p>
        </div>

        {auth ? (
          landingMetrics.length > 0 ? (
            <div className="list-grid">
              {landingMetrics.map(({ landing, metrics }) => (
                <article className="list-item" key={landing.id}>
                  <div>
                    <h3>{landing.title}</h3>
                    <div className="meta-row">
                      <span>{landing.type}</span>
                      <span>{landing.status}</span>
                      <span>{landing.publicSlug}</span>
                    </div>
                  </div>

                  <p>{landing.description || "No description yet."}</p>

                  <div className="metrics-grid">
                    <div className="detail-card">
                      <strong>{metrics.visitorCount}</strong>
                      <p>Visitors</p>
                    </div>
                    <div className="detail-card">
                      <strong>{metrics.totalClickCount}</strong>
                      <p>Clicks</p>
                    </div>
                  </div>

                  <div className="link-row">
                    {landing.status === "published" ? (
                      <Link className="text-link" href={`/l/${landing.publicSlug}`}>
                        Public
                      </Link>
                    ) : null}
                    <Link className="text-link" href={`/landings/${landing.id}`}>
                      Detail
                    </Link>
                    <Link className="text-link" href={`/analysis/${landing.id}`}>
                      Analysis
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="detail-card">
              <strong>No landings yet</strong>
              <p>Create your first draft landing to start collecting click, scroll, and dwell data.</p>
            </div>
          )
        ) : (
          <div className="detail-card">
            <strong>Creator Access Locked</strong>
            <p>Use an approved email on the login page to create, edit, and analyze landings.</p>
          </div>
        )}
      </section>
    </main>
  );
}
