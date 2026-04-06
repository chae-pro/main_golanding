"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppLink } from "@/components/navigation-progress";
import { SessionActions } from "@/components/session-actions";

export function AppHeader({
  email,
  isAdmin,
}: {
  email: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/");

    if (!email) {
      router.prefetch("/login");
      router.prefetch("/signup");
      return;
    }

    router.prefetch("/landings/new");

    if (isAdmin) {
      router.prefetch("/admin/accounts");
      router.prefetch("/admin/members");
    }
  }, [email, isAdmin, router]);

  if (pathname.startsWith("/l/")) {
    return null;
  }

  return (
    <header className="app-header">
      <div className="brand">
        <h1>고랜딩</h1>
      </div>

      <nav className="header-nav">
        <AppLink href="/">홈</AppLink>
        {!email ? <AppLink href="/login">로그인</AppLink> : null}
        {!email ? <AppLink href="/signup">회원가입</AppLink> : null}
        {isAdmin ? <AppLink href="/admin/accounts">관리자</AppLink> : null}
        {isAdmin ? <AppLink href="/admin/members">회원관리</AppLink> : null}
        {email ? <SessionActions email={email} /> : null}
      </nav>
    </header>
  );
}
