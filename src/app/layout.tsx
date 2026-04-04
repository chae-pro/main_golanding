import type { Metadata } from "next";
import Link from "next/link";

import { SessionActions } from "@/components/session-actions";
import { isAdminEmail } from "@/server/admin-auth";
import { getCurrentCreatorSession } from "@/server/session-auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "고랜딩",
  description: "랜딩페이지 제작과 히트맵, 스크롤맵, 체류맵 분석을 위한 고랜딩",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = await getCurrentCreatorSession();
  const isAdmin = auth ? isAdminEmail(auth.session.email) : false;

  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">
              <h1>고랜딩</h1>
              <p>랜딩 제작부터 히트맵, 스크롤맵, 체류맵 분석까지 한 곳에서 관리하세요.</p>
            </div>

            <nav className="header-nav">
              <Link href="/">홈</Link>
              {!auth ? <Link href="/login">로그인</Link> : null}
              {!auth ? <Link href="/signup">가입 신청</Link> : null}
              {isAdmin ? <Link href="/admin">관리자</Link> : null}
              {auth ? <SessionActions email={auth.session.email} /> : null}
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
