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
        <p>랜딩 제작부터 히트맵, 스크롤맵, 체류맵 분석까지 한 곳에서 관리하세요.</p>
      </div>

      <nav className="header-nav">
        <Link href="/">홈</Link>
        {!email ? <Link href="/login">로그인</Link> : null}
        {!email ? <Link href="/signup">회원가입</Link> : null}
        {isAdmin ? <Link href="/admin">관리자</Link> : null}
        {email ? <SessionActions email={email} /> : null}
      </nav>
    </header>
  );
}
