import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "kimjinsoo DB — 개인 브랜딩 대시보드",
  description: "김진수 브랜딩 · 링크 · 프로그램 아카이브",
};

// 하이드레이션 전 테마 적용 (플래시 방지)
const themeInitScript = `
(function(){try{var t=localStorage.getItem('kjs_theme')||'dark';if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <header
          className="sticky top-0 z-40 border-b bg-bg/80 backdrop-blur-xl"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                }}
              >
                KJS
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide">
                  kimjinsoo_DB
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                  personal dashboard
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <nav className="hidden items-center gap-1 text-sm sm:flex">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface hover:text-fg"
                >
                  메인
                </Link>
                <Link
                  href="/programs"
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface hover:text-fg"
                >
                  프로그램
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer
          className="mt-20 border-t py-10 text-center text-xs text-muted"
          style={{ borderColor: "var(--border)" }}
        >
          © {new Date().getFullYear()} kimjinsoo_DB · Built with Next.js
        </footer>
      </body>
    </html>
  );
}
