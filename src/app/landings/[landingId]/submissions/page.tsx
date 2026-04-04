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
        <span className="eyebrow">제출 내역</span>
        <h2>{landing.title}</h2>
        <p>DB 수집형 랜딩에서 들어온 제출 데이터를 여기서 확인할 수 있습니다.</p>
        <div className="link-row">
          <Link className="text-link" href={`/landings/${landing.id}`}>
            상세로 돌아가기
          </Link>
          <a
            className="ghost-button"
            href={`/api/landings/${landing.id}/submissions`}
            target="_blank"
          >
            CSV 다운로드
          </a>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="detail-card">
          <strong>0</strong>
          <p>아직 제출된 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>제출 일시</th>
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
