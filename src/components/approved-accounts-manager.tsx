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

function getAccountStatusLabel(status: ApprovedAccount["status"]) {
  if (status === "approved") {
    return "승인됨";
  }
  if (status === "blocked") {
    return "차단됨";
  }
  return "만료됨";
}

export function ApprovedAccountsManager({
  currentSessionId,
  initialAccounts,
  initialOverview,
  initialReadiness,
  initialSessions,
  variant = "full",
}: {
  currentSessionId: string;
  initialAccounts: ApprovedAccount[];
  initialOverview: AdminOverviewMetrics;
  initialReadiness: DeploymentReadiness;
  initialSessions: AdminCreatorSession[];
  variant?: "full" | "accounts-only" | "admin-only";
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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
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
      throw new Error(result.message ?? "계정 목록을 불러오지 못했습니다.");
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
      throw new Error(result.message ?? "세션 목록을 불러오지 못했습니다.");
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

  async function cancelAccountEdit() {
    await reloadAccounts();
    setEditingAccountId(null);
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
        throw new Error(result.message ?? "계정을 추가하지 못했습니다.");
      }

      setForm({
        email: "",
        name: "",
        cohort: "",
        expiresAt: "",
      });
      await Promise.all([reloadAccounts(), reloadSessions()]);
      setCreateState({ status: "success", message: "승인 계정을 추가했습니다." });
      router.refresh();
    } catch (error) {
      setCreateState({
        status: "error",
        message: error instanceof Error ? error.message : "계정을 추가하지 못했습니다.",
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
        throw new Error(result.message ?? "계정 정보를 수정하지 못했습니다.");
      }

      await Promise.all([reloadAccounts(), reloadSessions()]);
      setEditingAccountId(null);
      setRowState((previous) => ({
        ...previous,
        [accountId]: { status: "success", message: "저장되었습니다." },
      }));
      router.refresh();
    } catch (error) {
      setRowState((previous) => ({
        ...previous,
        [accountId]: {
          status: "error",
          message: error instanceof Error ? error.message : "계정 정보를 수정하지 못했습니다.",
        },
      }));
    } finally {
      setSavingRowId(null);
    }
  }

  async function deleteAccount(accountId: string) {
    if (!window.confirm("정말 이 승인 계정을 삭제하시겠습니까?")) {
      return;
    }

    setDeletingAccountId(accountId);
    setRowState((previous) => ({ ...previous, [accountId]: { status: "idle" } }));

    try {
      const response = await fetch(`/api/admin/accounts/${accountId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "계정 삭제에 실패했습니다.");
      }

      await Promise.all([reloadAccounts(), reloadSessions()]);
      setEditingAccountId(null);
      setRowState((previous) => ({
        ...previous,
        [accountId]: { status: "success", message: "계정을 삭제했습니다." },
      }));
      router.refresh();
    } catch (error) {
      setRowState((previous) => ({
        ...previous,
        [accountId]: {
          status: "error",
          message: error instanceof Error ? error.message : "계정 삭제에 실패했습니다.",
        },
      }));
    } finally {
      setDeletingAccountId(null);
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
        throw new Error(result.message ?? "CSV 가져오기에 실패했습니다.");
      }

      setCsvResult(result.result);
      await Promise.all([reloadAccounts(), reloadSessions()]);
      setCsvState({
        status: "success",
        message: `가져오기가 완료되었습니다. 추가 ${result.result.createdCount}건, 건너뜀 ${result.result.skippedCount}건, 오류 ${result.result.errorCount}건입니다.`,
      });
      router.refresh();
    } catch (error) {
      setCsvState({
        status: "error",
        message: error instanceof Error ? error.message : "CSV 가져오기에 실패했습니다.",
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
        throw new Error(result.message ?? "세션 강제 종료에 실패했습니다.");
      }

      await reloadSessions();
      setSessionState((previous) => ({
        ...previous,
        [sessionId]: { status: "success", message: "세션을 종료했습니다." },
      }));
      router.refresh();
    } catch (error) {
      setSessionState((previous) => ({
        ...previous,
        [sessionId]: {
          status: "error",
          message: error instanceof Error ? error.message : "세션 강제 종료에 실패했습니다.",
        },
      }));
    } finally {
      setRevokingSessionId(null);
    }
  }

  return (
    <div className="admin-stack">
      {variant !== "admin-only" ? (
      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">계정</span>
          <h2>승인 계정 {accounts.length}건</h2>
        </div>

        <div className="admin-line-list">
          {accounts.map((account) => {
            const accountState = rowState[account.id];
            const isEditing = editingAccountId === account.id;

            return (
              <article className="admin-line-row" key={account.id}>
                <div className="admin-line-main admin-line-main-accounts">
                  <div className="admin-line-title-block">
                    <strong>{account.email}</strong>
                    <span>생성일 {new Date(account.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>

                  {isEditing ? (
                    <label className="admin-inline-field">
                      <span>이름</span>
                      <input
                        type="text"
                        value={account.name}
                        onChange={(event) => updateAccount(account.id, "name", event.target.value)}
                      />
                    </label>
                  ) : (
                    <div className="admin-line-info">{account.name || "-"}</div>
                  )}

                  {isEditing ? (
                    <label className="admin-inline-field">
                      <span>기수</span>
                      <input
                        type="text"
                        value={account.cohort}
                        onChange={(event) => updateAccount(account.id, "cohort", event.target.value)}
                      />
                    </label>
                  ) : (
                    <div className="admin-line-info">{account.cohort || "-"}</div>
                  )}

                  {isEditing ? (
                    <label className="admin-inline-field admin-inline-field-select">
                      <span>상태</span>
                      <select
                        value={account.status}
                        onChange={(event) => updateAccount(account.id, "status", event.target.value)}
                      >
                        <option value="approved">승인됨</option>
                        <option value="blocked">차단됨</option>
                        <option value="expired">만료됨</option>
                      </select>
                    </label>
                  ) : (
                    <div className="admin-line-info">{getAccountStatusLabel(account.status)}</div>
                  )}

                  {isEditing ? (
                    <label className="admin-inline-field admin-inline-field-date">
                      <span>만료일</span>
                      <input
                        type="date"
                        value={account.expiresAt}
                        onChange={(event) =>
                          updateAccount(account.id, "expiresAt", event.target.value)
                        }
                      />
                    </label>
                  ) : (
                    <div className="admin-line-info">{account.expiresAt || "-"}</div>
                  )}
                </div>

                <div className="admin-line-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="ghost-button admin-line-button"
                        disabled={savingRowId === account.id}
                        onClick={() => void saveAccount(account.id)}
                        type="button"
                      >
                        {savingRowId === account.id ? "저장 중..." : "저장"}
                      </button>
                      <button
                        className="ghost-button admin-line-button"
                        disabled={savingRowId === account.id}
                        onClick={() => void cancelAccountEdit()}
                        type="button"
                      >
                        취소
                      </button>
                      <button
                        className="ghost-button admin-line-button"
                        disabled={savingRowId === account.id || deletingAccountId === account.id}
                        onClick={() => void deleteAccount(account.id)}
                        type="button"
                      >
                        {deletingAccountId === account.id ? "삭제 중..." : "삭제"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="ghost-button admin-line-button"
                        onClick={() => setEditingAccountId(account.id)}
                        type="button"
                      >
                        수정
                      </button>
                      <button
                        className="ghost-button admin-line-button"
                        disabled={deletingAccountId === account.id}
                        onClick={() => void deleteAccount(account.id)}
                        type="button"
                      >
                        {deletingAccountId === account.id ? "삭제 중..." : "삭제"}
                      </button>
                    </>
                  )}
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
      ) : null}

      {variant !== "accounts-only" ? (
        <>
          <section className="panel list-panel">
            <div className="section-heading">
              <span className="eyebrow">배포 점검</span>
              <h2>배포 준비 상태</h2>
              <p>
                현재 환경: {initialReadiness.environment}. 운영 배포 전에 아래 항목을 확인하세요.
              </p>
            </div>

            <div className="note-box">
              <strong>상태: {initialReadiness.overallStatus.toUpperCase()}</strong>
              <p>
                데이터베이스: {initialReadiness.dbProvider} | 스토리지: {initialReadiness.storageProvider}
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
              <span className="eyebrow">개요</span>
              <h2>관리자 대시보드 요약</h2>
              <p>현재 고랜딩 운영 상태를 한눈에 확인할 수 있습니다.</p>
            </div>

            <div className="metrics-grid admin-summary-grid">
              <div className="detail-card">
                <strong>{initialOverview.approvedAccountCount}</strong>
                <p>승인 계정 수</p>
              </div>
              <div className="detail-card">
                <strong>{initialOverview.activeSessionCount}</strong>
                <p>활성 세션 수</p>
              </div>
              <div className="detail-card">
                <strong>{initialOverview.publishedLandingCount}</strong>
                <p>발행된 랜딩 수</p>
              </div>
              <div className="detail-card">
                <strong>{initialOverview.totalLandingCount}</strong>
                <p>전체 랜딩 수</p>
              </div>
              <div className="detail-card">
                <strong>{initialOverview.recentVisitorCount}</strong>
                <p>최근 7일 방문 수</p>
              </div>
              <div className="detail-card">
                <strong>{initialOverview.recentFormSubmissionCount}</strong>
                <p>최근 7일 폼 제출</p>
              </div>
            </div>
          </section>

          <section className="panel form-panel">
            <div className="section-heading">
              <span className="eyebrow">관리자</span>
              <h2>승인된 제작자 계정</h2>
              <p>어떤 이메일이 고랜딩에 로그인하고 사용할 수 있는지 관리합니다.</p>
            </div>

            <div className="link-row">
              <button className="ghost-button" onClick={downloadAccountsCsv} type="button">
                계정 CSV 내보내기
              </button>
            </div>

            <form className="admin-create-form" onSubmit={createAccount}>
              <div className="grid-two">
                <label>
                  이메일
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>

                <label>
                  이름
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
                  기수
                  <input
                    type="text"
                    value={form.cohort}
                    onChange={(event) => setForm((prev) => ({ ...prev, cohort: event.target.value }))}
                  />
                </label>

                <label>
                  만료일
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
                {isCreating ? "추가 중..." : "승인 계정 추가"}
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
              <span className="eyebrow">CSV 가져오기</span>
              <h2>승인 계정 일괄 추가</h2>
              <p>순서는 email, name, cohort, expiresAt 입니다. 기존 이메일은 덮어쓰지 않고 건너뜁니다.</p>
            </div>

            <form className="admin-create-form" onSubmit={importCsv}>
              <label>
                CSV 파일 불러오기
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
                CSV 내용
                <textarea
                  placeholder={
                    "email,name,cohort,expiresAt\nstudent1@example.com,홍길동,meta-ads-2026-01,2026-12-31"
                  }
                  rows={8}
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                />
              </label>

              <button className="primary-button" disabled={isImporting} type="submit">
                {isImporting ? "가져오는 중..." : "CSV 가져오기"}
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
                    <p>전체 행 수</p>
                  </div>
                  <div className="detail-card">
                    <strong>{csvResult.createdCount}</strong>
                    <p>추가됨</p>
                  </div>
                  <div className="detail-card">
                    <strong>{csvResult.skippedCount}</strong>
                    <p>건너뜀</p>
                  </div>
                  <div className="detail-card">
                    <strong>{csvResult.errorCount}</strong>
                    <p>오류</p>
                  </div>
                </div>

                {csvResult.skipped.length > 0 ? (
                  <div className="note-box">
                    <strong>건너뛴 행</strong>
                    <div className="admin-inline-list">
                      {csvResult.skipped.map((item) => (
                        <span key={`${item.rowNumber}-${item.email}`}>
                          {item.rowNumber}행 {item.email} ({item.reason})
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {csvResult.errors.length > 0 ? (
                  <div className="note-box">
                    <strong>오류 행</strong>
                    <div className="admin-inline-list">
                      {csvResult.errors.map((item) => (
                        <span key={`${item.rowNumber}-${item.raw}`}>
                          {item.rowNumber}행 {item.reason}
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
              <span className="eyebrow">세션</span>
              <h2>활성 제작자 세션 {sessions.length}건</h2>
              <p>현재 로그인 중인 사용자를 확인하고 필요하면 즉시 세션을 종료할 수 있습니다.</p>
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
                            {current ? <span>현재 세션</span> : null}
                          </div>
                        </div>
                        <button
                          className="ghost-button"
                          disabled={revokingSessionId === session.id}
                          onClick={() => void revokeSession(session.id)}
                          type="button"
                        >
                          {revokingSessionId === session.id ? "종료 중..." : "강제 로그아웃"}
                        </button>
                      </div>

                      <div className="grid-two">
                        <div className="detail-card">
                          <strong>{new Date(session.lastValidatedAt).toLocaleString("ko-KR")}</strong>
                          <p>마지막 확인 시각</p>
                        </div>
                        <div className="detail-card">
                          <strong>{new Date(session.expiresAt).toLocaleString("ko-KR")}</strong>
                          <p>세션 만료 시각</p>
                        </div>
                      </div>

                      <div className="meta-row">
                        <span>생성 시각 {new Date(session.createdAt).toLocaleString("ko-KR")}</span>
                        <span>세션 ID {session.id}</span>
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
                  <strong>활성 세션이 없습니다</strong>
                  <p>현재 활성 상태인 제작자 세션이 없습니다.</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
