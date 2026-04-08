import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "kimjinsoo DB — 개인 브랜딩 대시보드",
  description: "김진수 브랜딩 · 링크 · 프로그램 아카이브",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <header className="sticky top-0 z-40 border-b border-white/5 bg-brand-navy/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-accent text-sm font-bold text-brand-navy">
                KJS
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide">
                  kimjinsoo_DB
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  personal dashboard
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white"
              >
                메인
              </Link>
              <Link
                href="/programs"
                className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white"
              >
                프로그램
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mt-20 border-t border-white/5 py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} kimjinsoo_DB · Built with Next.js
        </footer>
      </body>
    </html>
  );
}
