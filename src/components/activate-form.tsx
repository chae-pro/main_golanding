"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function ActivateForm() {
  const router = useRouter();
  const [email, setEmail] = useState("classdemo@example.com");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<LoginState>({ status: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setState({ status: "idle" });

    try {
      const response = await fetch("/api/access/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        session?: { email: string; expiresAt: string };
      };

      if (!response.ok || !result.session) {
        throw new Error(result.message ?? "Sign in failed.");
      }

      setState({
        status: "success",
        message: `Signed in until ${new Date(result.session.expiresAt).toLocaleString()}`,
      });
      router.push("/landings/new");
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Sign in failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <div className="section-heading">
        <span className="eyebrow">Access</span>
        <h2>Sign In To Golanding</h2>
        <p>Approved email only. This SaaS build uses a server-side web session.</p>
      </div>

      <label>
        Approved email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "status-success" : "status-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
