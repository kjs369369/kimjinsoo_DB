"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  migrateLocalToCloud,
  isMigrationDone,
  clearMigrationFlag,
  MigrationResult,
} from "@/lib/migrate-to-cloud";
import { loadState } from "@/lib/storage";

const ADMIN_AUTH_KEY = "kimjinsoo_admin_auth_v1";
const ADMIN_TOKEN_KEY = "kimjinsoo_admin_token_v1";

type Counts = {
  programs: number;
  lectures: number;
  state: { hasProfile: boolean; websites: number; socials: number };
};

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [localCounts, setLocalCounts] = useState<{ programs: number; lectures: number } | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);

  // 인증 확인
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ADMIN_AUTH_KEY) !== "1") {
      router.replace("/");
      return;
    }
    setAuthed(true);
  }, [router]);

  // 로컬 데이터 카운트 + 마이그레이션 상태
  useEffect(() => {
    if (!authed) return;
    const local = loadState();
    setLocalCounts({
      programs: local.programs.length,
      lectures: local.lectures.length,
    });
    setMigrationDone(isMigrationDone());
  }, [authed]);

  // 클라우드 통계 로드
  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    Promise.all([
      fetch("/api/db/state", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/db/programs", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/db/lectures", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([s, p, l]) => {
        if (!s.ok || !p.ok || !l.ok) {
          throw new Error("API 응답 실패");
        }
        setCounts({
          programs: p.data.length,
          lectures: l.data.length,
          state: {
            hasProfile: Boolean(s.data.profile?.name),
            websites: s.data.websites?.length ?? 0,
            socials: s.data.socials?.length ?? 0,
          },
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authed]);

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    router.replace("/");
  }

  async function handleMigrate() {
    if (!confirm("로컬 데이터를 클라우드로 업로드합니다. 이 작업은 한 번만 수행됩니다. 진행할까요?")) return;
    setMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateLocalToCloud();
      setMigrationResult(result);
      if (result.ok) {
        setMigrationDone(true);
        // 통계 새로고침
        setTimeout(() => location.reload(), 1500);
      }
    } finally {
      setMigrating(false);
    }
  }

  function handleResetMigrationFlag() {
    if (!confirm("마이그레이션 완료 플래그를 해제합니다. 다시 한 번 마이그레이션할 수 있게 됩니다 (중복 데이터 발생 가능). 진행할까요?")) return;
    clearMigrationFlag();
    setMigrationDone(false);
  }

  if (!authed) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Supabase 동기화 관리</p>
        </div>
        <button className="btn text-xs" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      {error && (
        <div className="card border-red-500/30 p-4 text-sm text-red-400">
          오류: {error}
        </div>
      )}

      {loading && (
        <div className="card p-6 text-center text-sm text-muted">불러오는 중…</div>
      )}

      {counts && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-xs text-muted">프로그램</div>
            <div className="mt-1 text-3xl font-bold">{counts.programs}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted">강의 이력</div>
            <div className="mt-1 text-3xl font-bold">{counts.lectures}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-muted">웹사이트 / 소셜</div>
            <div className="mt-1 text-3xl font-bold">
              {counts.state.websites} / {counts.state.socials}
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-3 p-6">
        <h2 className="font-semibold">바로가기</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link href="/" className="btn text-center text-sm">
            🏠 메인 (프로필·링크)
          </Link>
          <Link href="/programs" className="btn text-center text-sm">
            📦 프로그램 관리
          </Link>
          <Link href="/lectures" className="btn text-center text-sm">
            🎓 강의 이력
          </Link>
        </div>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold">localStorage → Supabase 마이그레이션</h2>
        {localCounts && (
          <p className="text-sm text-muted">
            이 브라우저의 localStorage: 프로그램 <b className="text-fg">{localCounts.programs}</b>개,
            강의 <b className="text-fg">{localCounts.lectures}</b>개
          </p>
        )}
        {migrationDone ? (
          <div className="space-y-3">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              ✅ 이 브라우저에서 마이그레이션 완료됨
            </div>
            <button
              className="btn text-xs text-muted"
              onClick={handleResetMigrationFlag}
            >
              플래그 해제 (재시도용)
            </button>
          </div>
        ) : (
          <button
            className="btn-primary"
            onClick={handleMigrate}
            disabled={migrating}
          >
            {migrating ? "업로드 중…" : "☁ 클라우드로 이주"}
          </button>
        )}
        {migrationResult && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              migrationResult.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {migrationResult.message}
          </div>
        )}
      </div>

      <div className="card p-6 text-sm text-muted">
        <p>
          모든 데이터는 Supabase에 자동 동기화됩니다. PC·노트북·모바일 어디서
          접속해도 같은 데이터를 보고 편집할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
