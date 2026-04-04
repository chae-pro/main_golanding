import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { LandingStatusControls } from "@/components/landing-status-controls";
import { getLandingMetrics } from "@/server/analytics-service";
import { getLandingById } from "@/server/landing-service";
import { getCurrentCreatorSession } from "@/server/session-auth";

type LandingDetailPageProps = {
  params: Promise<{ landingId: string }>;
};

export default async function LandingDetailPage({ params }: LandingDetailPageProps) {
  const auth = await getCurrentCreatorSession();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;
  const landing = await getLandingById(landingId);
  const metrics = landing ? await getLandingMetrics(landing.id) : null;

  if (!landing) {
    notFound();
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    redirect("/");
  }

  return (
    <main className="panel detail-panel">
      <div className="section-heading">
        <span className="eyebrow">Landing Detail</span>
        <h2>{landing.title}</h2>
        <p>{landing.description || "No description yet."}</p>
        <div className="link-row">
          <Link className="text-link" href={`/landings/${landing.id}/edit`}>
            Edit
          </Link>
          <Link className="text-link" href={`/landings/${landing.id}/submissions`}>
            Submissions
          </Link>
          <LandingStatusControls landingId={landing.id} currentStatus={landing.status} />
          <a
            className="ghost-button"
            href={`/api/landings/${landing.id}/submissions`}
            target="_blank"
          >
            Download CSV
          </a>
          {landing.status === "published" ? (
            <Link className="text-link" href={`/l/${landing.publicSlug}`} target="_blank">
              Open Public Page
            </Link>
          ) : null}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <strong>{landing.type}</strong>
          <p>Landing type</p>
        </div>
        <div className="detail-card">
          <strong>{landing.status}</strong>
          <p>Status</p>
        </div>
        <div className="detail-card">
          <strong>{landing.ownerEmail}</strong>
          <p>Owner email</p>
        </div>
        <div className="detail-card">
          <strong>{landing.publicSlug}</strong>
          <p>Public slug</p>
        </div>
        <div className="detail-card">
          <strong>{metrics?.visitorCount ?? 0}</strong>
          <p>Visitors</p>
        </div>
        <div className="detail-card">
          <strong>{landing.images.length}</strong>
          <p>Image count</p>
        </div>
        <div className="detail-card">
          <strong>{landing.buttons.length}</strong>
          <p>Button count</p>
        </div>
      </div>

      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">Public URL</span>
          <h2>/l/{landing.publicSlug}</h2>
          <p>{landing.status === "published" ? "Publicly accessible now." : "Only available after publish."}</p>
        </div>
      </section>

      <section className="list-panel">
        <div className="section-heading">
          <span className="eyebrow">Theme</span>
          <h2>Visual settings</h2>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <strong>{landing.theme.primaryColor}</strong>
            <p>Primary color</p>
          </div>
          <div className="detail-card">
            <strong>{landing.theme.textColor}</strong>
            <p>Text color</p>
          </div>
          <div className="detail-card">
            <strong>{landing.theme.surfaceColor}</strong>
            <p>Surface color</p>
          </div>
          <div className="detail-card">
            <strong>{landing.theme.radius}px</strong>
            <p>Radius</p>
          </div>
        </div>
      </section>
    </main>
  );
}
