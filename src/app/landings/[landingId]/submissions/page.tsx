import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { listFormSubmissionsByLanding } from "@/server/analytics-service";
import { getLandingById } from "@/server/landing-service";
import { getCurrentCreatorSession } from "@/server/session-auth";

type LandingSubmissionsPageProps = {
  params: Promise<{ landingId: string }>;
};

function collectLabels(
  submissions: Awaited<ReturnType<typeof listFormSubmissionsByLanding>>,
) {
  return Array.from(
    new Set(submissions.flatMap((submission) => submission.values.map((value) => value.label))),
  );
}

export default async function LandingSubmissionsPage({ params }: LandingSubmissionsPageProps) {
  const auth = await getCurrentCreatorSession();

  if (!auth) {
    redirect("/login");
  }

  const { landingId } = await params;
  const landing = await getLandingById(landingId);

  if (!landing) {
    notFound();
  }

  if (landing.ownerEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
    redirect("/landings/new");
  }

  const submissions = await listFormSubmissionsByLanding(landingId);
  const labels = collectLabels(submissions);

  return (
    <main className="panel detail-panel">
      <div className="section-heading">
        <span className="eyebrow">Submissions</span>
        <h2>{landing.title}</h2>
        <p>In-app submission view for DB collection landings.</p>
        <div className="link-row">
          <Link className="text-link" href={`/landings/${landing.id}`}>
            Back To Detail
          </Link>
          <a
            className="ghost-button"
            href={`/api/landings/${landing.id}/submissions`}
            target="_blank"
          >
            Download CSV
          </a>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="detail-card">
          <strong>0</strong>
          <p>No submissions yet.</p>
        </div>
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Submitted At</th>
                {labels.map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => {
                const valueMap = new Map(
                  submission.values.map((value) => [value.label, value.value]),
                );

                return (
                  <tr key={submission.id}>
                    <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                    {labels.map((label) => (
                      <td key={`${submission.id}-${label}`}>{valueMap.get(label) ?? ""}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
