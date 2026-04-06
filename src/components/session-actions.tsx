"use client";

import { useTransition } from "react";

import { useNavigationPush } from "@/components/navigation-progress";

export function SessionActions({ email }: { email: string }) {
  const navigation = useNavigationPush();
  const [isPending, startTransition] = useTransition();

  async function signOut() {
    await fetch("/api/access/logout", {
      method: "POST",
    });

    startTransition(() => {
      navigation.push("/login");
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
