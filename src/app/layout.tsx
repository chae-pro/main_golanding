import type { Metadata } from "next";
import Link from "next/link";

import { SessionActions } from "@/components/session-actions";
import { isAdminEmail } from "@/server/admin-auth";
import { getCurrentCreatorSession } from "@/server/session-auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "Golanding",
  description: "Landing heatmap, scroll map, and dwell map scaffold.",
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
              <h1>Golanding</h1>
              <p>Landing builder and analytics scaffold for heatmap, scroll map, and dwell map.</p>
            </div>

            <nav className="header-nav">
              <Link href="/">Home</Link>
              <Link href="/login">Login</Link>
              <Link href="/landings/new">New Landing</Link>
              {isAdmin ? <Link href="/admin/accounts">Admin</Link> : null}
              {auth ? <SessionActions email={auth.session.email} /> : null}
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
