"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SessionActions } from "@/components/session-actions";

export function AppHeader({
  email,
  isAdmin,
}: {
  email: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/l/")) {
    return null;
  }

  return (
    <header className="app-header">
      <div className="brand">
        <h1>고랜딩</h1>
      </div>

      <nav className="header-nav">
        <Link href="/">홈</Link>
        {!email ? <Link href="/login">로그인</Link> : null}
        {!email ? <Link href="/signup">회원가입</Link> : null}
        {isAdmin ? <Link href="/admin/members">회원관리</Link> : null}
        {email ? <SessionActions email={email} /> : null}
      </nav>
    </header>
  );
}
