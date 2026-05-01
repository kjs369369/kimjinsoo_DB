"use client";
import { loadState } from "./storage";
import { createProgram, createLecture } from "./db-client";

const MIGRATION_FLAG = "kimjinsoo_migrated_to_supabase_v1";
const ADMIN_TOKEN_KEY = "kimjinsoo_admin_token_v1";

export type MigrationResult = {
  ok: boolean;
  message: string;
  programs?: { tried: number; ok: number; failed: number };
  lectures?: { tried: number; ok: number; failed: number };
};

export function isMigrationDone(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATION_FLAG) === "1";
}

export function clearMigrationFlag() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATION_FLAG);
}

export async function migrateLocalToCloud(): Promise<MigrationResult> {
  if (typeof window === "undefined") {
    return { ok: false, message: "브라우저 환경이 아닙니다" };
  }
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    return { ok: false, message: "어드민 인증이 필요합니다 (다시 로그인 후 시도)" };
  }
  if (isMigrationDone()) {
    return { ok: true, message: "이미 마이그레이션이 완료되었습니다" };
  }

  const local = loadState();

  // 1) state 통합 업데이트 (profile, websites, socials, work_links, partners, footer)
  const stateRes = await fetch("/api/db/state", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      profile: local.profile,
      websites: local.websites,
      socials: local.socials,
      work_links: local.workLinks,
      partners: local.partners,
      footer: local.footer,
    }),
  });
  if (!stateRes.ok) {
    const err = await stateRes.text();
    return { ok: false, message: `state 업로드 실패: ${err}` };
  }

  // 2) programs 일괄 업로드 — 이미 클라우드에 같은 id 있으면 실패하지만 무시 (idempotent 시도)
  let progOk = 0;
  let progFail = 0;
  for (const p of local.programs) {
    const result = await createProgram(p);
    if (result) progOk++;
    else progFail++;
  }

  // 3) lectures 일괄 업로드
  let lecOk = 0;
  let lecFail = 0;
  for (const l of local.lectures) {
    const ok = await createLecture(l);
    if (ok) lecOk++;
    else lecFail++;
  }

  localStorage.setItem(MIGRATION_FLAG, "1");

  return {
    ok: true,
    message: `마이그레이션 완료 — 프로그램 ${progOk}/${local.programs.length}, 강의 ${lecOk}/${local.lectures.length}`,
    programs: { tried: local.programs.length, ok: progOk, failed: progFail },
    lectures: { tried: local.lectures.length, ok: lecOk, failed: lecFail },
  };
}
