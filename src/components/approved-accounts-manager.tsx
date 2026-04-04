"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  AdminCreatorSession,
  AdminOverviewMetrics,
  DeploymentReadiness,
  ApprovedAccount,
} from "@/domain/types";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type CsvImportResult = {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  created: Array<{ email: string; name: string }>;
  skipped: Array<{ rowNumber: number; email: string; reason: string }>;
  errors: Array<{ rowNumber: number; raw: string; reason: string }>;
};

type EditableAccount = {
  id: string;
  email: string;
  name: string;
  cohort: string;
  status: ApprovedAccount["status"];
  expiresAt: string;
  createdAt: string;
};

type EditableSession = {
  id: string;
  email: string;
  accountName: string;
  cohort: string;
  expiresAt: string;
  lastValidatedAt: string;
  createdAt: string;
};

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function mapAccount(account: ApprovedAccount): EditableAccount {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    cohort: account.cohort ?? "",
    status: account.status,
    expiresAt: toDateInputValue(account.expiresAt),
    createdAt: account.createdAt,
  };
}

function mapSession(session: AdminCreatorSession): EditableSession {
  return {
    id: session.id,
    email: session.email,
    accountName: session.accountName,
    cohort: session.cohort ?? "",
    expiresAt: session.expiresAt,
    lastValidatedAt: session.lastValidatedAt,
    createdAt: session.createdAt,
  };
}

export function ApprovedAccountsManager({
  currentSessionId,
  initialAccounts,
  initialOverview,
  initialReadiness,
  initialSessions,
}: {
  currentSessionId: string;
  initialAccounts: ApprovedAccount[];
  initialOverview: AdminOverviewMetrics;
  initialReadiness: DeploymentReadiness;
  initialSessions: AdminCreatorSession[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(() => initialAccounts.map(mapAccount));
  const [sessions, setSessions] = useState(() => initialSessions.map(mapSession));
  const [form, setForm] = useState({
    email: "",
    name: "",
    cohort: "",
    expiresAt: "",
  });
  const [createState, setCreateState] = useState<SubmitState>({ status: "idle" });
  const [csvText, setCsvText] = useState("");
  const [csvState, setCsvState] = useState<SubmitState>({ status: "idle" });
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [rowState, setRowState] = useState<Record<string, SubmitState>>({});
  const [sessionState, setSessionState] = useState<Record<string, SubmitState>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  function downloadAccountsCsv() {
    window.location.href = "/api/admin/accounts/export";
  }

  async function reloadAccounts() {
    const response = await fetch("/api/admin/accounts", {
      method: "GET",
      cache: "no-store",
    });
    const result = (await response.json()) as { message?: string; accounts?: ApprovedAccount[] };

    if (!response.ok || !result.accounts) {
      throw new Error(result.message ?? "Failed to refresh accounts.");
    }

    setAccounts(result.accounts.map(mapAccount));
  }

  async function reloadSessions() {
    const response = await fetch("/api/admin/sessions", {
      method: "GET",
      cache: "no-store",
    });
    const result = (await response.json()) as {
      message?: string;
      sessions?: AdminCreatorSession[];
    };

    if (!response.ok || !result.sessions) {
      throw new Error(result.message ?? "Failed to refresh sessions.");
    }

    setSessions(result.sessions.map(mapSession));
  }

  function updateAccount(accountId: string, field: keyof EditableAccount, value: string) {
    setAccounts((previous) =>
      previous.map((account) =>
        account.id === accountId ? { ...account, [field]: value } : account,
      ),
    );
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setCreateState({ status: "idle" });

    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as { message?: string; account?: ApprovedAccount };

      if (!response.ok || !result.account) {
        throw new Error(result.message ?? "Failed to create account.");
      }

      setForm({
        email: "",
        name: "",
        cohort: "",
        expiresAt: "",
      });
      await Promise.all([reloadAccounts(), reloadSessions()]);
      setCreateState({ status: "success", message: "Approved account added." });
      router.refresh();
    } catch (error) {
      setCreateState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to create account.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function saveAccount(accountId: string) {
    const account = accounts.find((item) => item.id === accountId);

    if (!account) {
      return;
    }

    setSavingRowId(accountId);
    setRowState((previous) => ({ ...previous, [accountId]: { status: "idle" } }));

    try {
      const response = await fetch(`/api/admin/accounts/${accountId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: account.name,
          cohort: account.cohort,
          status: account.status,
          expiresAt: account.expiresAt,
        }),
      });

      const result = (await response.json()) as { message?: string; account?: ApprovedAccount };

      if (!response.ok || !result.account) {
        throw new Error(result.message ?? "Failed to update account.");
      }

      await Promise.all([reloadAccounts(), reloadSessions()]);
      setRowState((previous) => ({
        ...previous,
        [accountId]: { status: "success", message: "Saved." },
      }));
      router.refresh();
    } catch (error) {
      setRowState((previous) => ({
        ...previous,
        [accountId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Failed to update account.",
        },
      }));
    } finally {
      setSavingRowId(null);
    }
  }

  async function importCsv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsImporting(true);
    setCsvState({ status: "idle" });
    setCsvResult(null);

    try {
      const response = await fetch("/api/admin/accounts/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          csvText,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        result?: CsvImportResult;
      };

      if (!response.ok || !result.result) {
        throw new Error(result.message ?? "CSV import failed.");
      }

      setCsvResult(result.result);
      await Promise.all([reloadAccounts(), reloadSessions()]);
      setCsvState({
        status: "success",
        message: `Import completed. Created ${result.result.createdCount}, skipped ${result.result.skippedCount}, errors ${result.result.errorCount}.`,
      });
      router.refresh();
    } catch (error) {
      setCsvState({
        status: "error",
        message: error instanceof Error ? error.message : "CSV import failed.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function revokeSession(sessionId: string) {
    setRevokingSessionId(sessionId);
    setSessionState((previous) => ({
      ...previous,
      [sessionId]: { status: "idle" },
    }));

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to revoke session.");
      }

      await reloadSessions();
      setSessionState((previous) => ({
        ...previous,
        [sessionId]: { status: "success", message: "Session revoked." },
      }));
      router.refresh();
    } catch (error) {
      setSessionState((previous) => ({
        ...previous,
        [sessionId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Failed to revoke session.",
        },
      }));
    } finally {
      setRevokingSessionId(null);
    }
  }

  return (
    <div className="admin-stack">
      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">Readiness</span>
          <h2>Deployment Readiness</h2>
          <p>
            Current environment: {initialReadiness.environment}. Review these checks before
            production deployment.
          </p>
        </div>

        <div className="note-box">
          <strong>Status: {initialReadiness.overallStatus.toUpperCase()}</strong>
          <p>
            Database: {initialReadiness.dbProvider} | Storage: {initialReadiness.storageProvider}
          </p>
        </div>

        <div className="admin-readiness-list">
          {initialReadiness.checks.map((check) => (
            <article className={`list-item readiness-item readiness-${check.status}`} key={check.id}>
              <div className="admin-account-header">
                <div>
                  <h3>{check.label}</h3>
                  <div className="meta-row">
                    <span>{check.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <p>{check.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">Overview</span>
          <h2>Admin Dashboard Snapshot</h2>
          <p>These cards show the current operating state of Golanding.</p>
        </div>

        <div className="metrics-grid admin-summary-grid">
          <div className="detail-card">
            <strong>{initialOverview.approvedAccountCount}</strong>
            <p>Approved accounts</p>
          </div>
          <div className="detail-card">
            <strong>{initialOverview.activeSessionCount}</strong>
            <p>Active sessions</p>
          </div>
          <div className="detail-card">
            <strong>{initialOverview.publishedLandingCount}</strong>
            <p>Published landings</p>
          </div>
          <div className="detail-card">
            <strong>{initialOverview.totalLandingCount}</strong>
            <p>Total landings</p>
          </div>
          <div className="detail-card">
            <strong>{initialOverview.recentVisitorCount}</strong>
            <p>Visitors, last 7 days</p>
          </div>
          <div className="detail-card">
            <strong>{initialOverview.recentFormSubmissionCount}</strong>
            <p>Form submits, last 7 days</p>
          </div>
        </div>
      </section>

      <section className="panel form-panel">
        <div className="section-heading">
          <span className="eyebrow">Admin</span>
          <h2>Approved Creator Accounts</h2>
          <p>Manage which email addresses can sign in and use Golanding.</p>
        </div>

        <div className="link-row">
          <button className="ghost-button" onClick={downloadAccountsCsv} type="button">
            Export Accounts CSV
          </button>
        </div>

        <form className="admin-create-form" onSubmit={createAccount}>
          <div className="grid-two">
            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>

            <label>
              Name
              <input
                required
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid-two">
            <label>
              Cohort
              <input
                type="text"
                value={form.cohort}
                onChange={(event) => setForm((prev) => ({ ...prev, cohort: event.target.value }))}
              />
            </label>

            <label>
              Expires at
              <input
                type="date"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
              />
            </label>
          </div>

          <button className="primary-button" disabled={isCreating} type="submit">
            {isCreating ? "Adding..." : "Add Approved Account"}
          </button>

          {createState.status !== "idle" ? (
            <p className={createState.status === "success" ? "status-success" : "status-error"}>
              {createState.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="panel form-panel">
        <div className="section-heading">
          <span className="eyebrow">CSV Import</span>
          <h2>Bulk Add Approved Accounts</h2>
          <p>Use columns: email, name, cohort, expiresAt. Existing emails are skipped, not overwritten.</p>
        </div>

        <form className="admin-create-form" onSubmit={importCsv}>
          <label>
            Load CSV file
            <input
              accept=".csv,text/csv"
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                const text = await file.text();
                setCsvText(text);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <label>
            CSV content
            <textarea
              placeholder={
                "email,name,cohort,expiresAt\nstudent1@example.com,Student One,meta-ads-2026-01,2026-12-31"
              }
              rows={8}
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
            />
          </label>

          <button className="primary-button" disabled={isImporting} type="submit">
            {isImporting ? "Importing..." : "Import CSV"}
          </button>

          {csvState.status !== "idle" ? (
            <p className={csvState.status === "success" ? "status-success" : "status-error"}>
              {csvState.message}
            </p>
          ) : null}
        </form>

        {csvResult ? (
          <div className="admin-import-results">
            <div className="metrics-grid">
              <div className="detail-card">
                <strong>{csvResult.totalRows}</strong>
                <p>Total rows</p>
              </div>
              <div className="detail-card">
                <strong>{csvResult.createdCount}</strong>
                <p>Created</p>
              </div>
              <div className="detail-card">
                <strong>{csvResult.skippedCount}</strong>
                <p>Skipped</p>
              </div>
              <div className="detail-card">
                <strong>{csvResult.errorCount}</strong>
                <p>Errors</p>
              </div>
            </div>

            {csvResult.skipped.length > 0 ? (
              <div className="note-box">
                <strong>Skipped rows</strong>
                <div className="admin-inline-list">
                  {csvResult.skipped.map((item) => (
                    <span key={`${item.rowNumber}-${item.email}`}>
                      Row {item.rowNumber}: {item.email} ({item.reason})
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {csvResult.errors.length > 0 ? (
              <div className="note-box">
                <strong>Error rows</strong>
                <div className="admin-inline-list">
                  {csvResult.errors.map((item) => (
                    <span key={`${item.rowNumber}-${item.raw}`}>
                      Row {item.rowNumber}: {item.reason}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">Sessions</span>
          <h2>{sessions.length} active creator sessions</h2>
          <p>Use this list to monitor who is logged in and revoke access immediately when needed.</p>
        </div>

        <div className="admin-account-list">
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const current = session.id === currentSessionId;
              const rowStatus = sessionState[session.id];

              return (
                <article className="list-item" key={session.id}>
                  <div className="admin-account-header">
                    <div>
                      <h3>{session.email}</h3>
                      <div className="meta-row">
                        <span>{session.accountName}</span>
                        {session.cohort ? <span>{session.cohort}</span> : null}
                        {current ? <span>Current session</span> : null}
                      </div>
                    </div>
                    <button
                      className="ghost-button"
                      disabled={revokingSessionId === session.id}
                      onClick={() => void revokeSession(session.id)}
                      type="button"
                    >
                      {revokingSessionId === session.id ? "Revoking..." : "Force Logout"}
                    </button>
                  </div>

                  <div className="grid-two">
                    <div className="detail-card">
                      <strong>{new Date(session.lastValidatedAt).toLocaleString()}</strong>
                      <p>Last validated</p>
                    </div>
                    <div className="detail-card">
                      <strong>{new Date(session.expiresAt).toLocaleString()}</strong>
                      <p>Session expires</p>
                    </div>
                  </div>

                  <div className="meta-row">
                    <span>Created {new Date(session.createdAt).toLocaleString()}</span>
                    <span>Session ID {session.id}</span>
                  </div>

                  {rowStatus && rowStatus.status !== "idle" ? (
                    <p className={rowStatus.status === "success" ? "status-success" : "status-error"}>
                      {rowStatus.message}
                    </p>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="detail-card">
              <strong>No active sessions</strong>
              <p>There are currently no creator sessions in active state.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">Accounts</span>
          <h2>{accounts.length} approved account records</h2>
          <p>Status changes take effect immediately. Blocked or expired accounts lose active sessions.</p>
        </div>

        <div className="admin-account-list">
          {accounts.map((account) => {
            const accountState = rowState[account.id];

            return (
              <article className="list-item" key={account.id}>
                <div className="admin-account-header">
                  <div>
                    <h3>{account.email}</h3>
                    <div className="meta-row">
                      <span>Created {new Date(account.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    className="ghost-button"
                    disabled={savingRowId === account.id}
                    onClick={() => void saveAccount(account.id)}
                    type="button"
                  >
                    {savingRowId === account.id ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="grid-two">
                  <label>
                    Name
                    <input
                      type="text"
                      value={account.name}
                      onChange={(event) => updateAccount(account.id, "name", event.target.value)}
                    />
                  </label>

                  <label>
                    Cohort
                    <input
                      type="text"
                      value={account.cohort}
                      onChange={(event) => updateAccount(account.id, "cohort", event.target.value)}
                    />
                  </label>
                </div>

                <div className="grid-two">
                  <label>
                    Status
                    <select
                      value={account.status}
                      onChange={(event) => updateAccount(account.id, "status", event.target.value)}
                    >
                      <option value="approved">Approved</option>
                      <option value="blocked">Blocked</option>
                      <option value="expired">Expired</option>
                    </select>
                  </label>

                  <label>
                    Expires at
                    <input
                      type="date"
                      value={account.expiresAt}
                      onChange={(event) =>
                        updateAccount(account.id, "expiresAt", event.target.value)
                      }
                    />
                  </label>
                </div>

                {accountState && accountState.status !== "idle" ? (
                  <p className={accountState.status === "success" ? "status-success" : "status-error"}>
                    {accountState.message}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
