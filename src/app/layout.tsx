import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { isAdminEmail } from "@/server/admin-auth";
import { getCurrentCreatorSessionSnapshot } from "@/server/session-auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "고랜딩",
  description: "랜딩페이지 제작과 히트맵, 스크롤맵, 체류맵 분석을 위한 고랜딩",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = await getCurrentCreatorSessionSnapshot();
  const isAdmin = auth ? isAdminEmail(auth.session.email) : false;

  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <AppHeader email={auth?.session.email ?? null} isAdmin={isAdmin} />
          {children}
        </div>
      </body>
    </html>
  );
}
