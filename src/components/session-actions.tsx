"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function SessionActions({ email }: { email: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function signOut() {
    await fetch("/api/access/logout", {
      method: "POST",
    });

    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <>
      <span className="session-chip">{email}</span>
      <button className="ghost-button" disabled={isPending} onClick={signOut} type="button">
        {isPending ? "로그아웃 중..." : "로그아웃"}
      </button>
    </>
  );
}
