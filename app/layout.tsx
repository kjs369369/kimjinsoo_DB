import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const SITE_URL = "https://kimjinsoo-db.vercel.app";
const OG_IMAGE = "https://image-url-dusky.vercel.app/s/04b31289";
const SITE_TITLE = "Kimjinsoo · Official Hub";
const SITE_DESC =
  "김진수 (AICLab 대표) 브랜딩 · 공식 링크 · 프로그램 아카이브 · 개인 대시보드";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "kimjinsoo_DB",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [OG_IMAGE],
  },
  other: {
    // KakaoTalk이 참조하는 추가 태그
    "og:image": OG_IMAGE,
    "og:image:secure_url": OG_IMAGE,
    "og:image:type": "image/png",
    "og:image:width": "1200",
    "og:image:height": "630",
  },
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
                <Link
                  href="/lectures"
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface hover:text-fg"
                >
                  강의이력
                </Link>
                <Link
                  href="/vault"
                  className="rounded-lg px-3 py-2 text-muted hover:bg-surface hover:text-[var(--point)]"
                >
                  🔒 Vault
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
