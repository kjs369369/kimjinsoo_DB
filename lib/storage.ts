"use client";
import { DbState, Lecture, Program, LECTURE_TYPE_META, LECTURE_STATUS_META } from "./types";

const KEY = "kimjinsoo_db_v1";
const META_KEY = "kimjinsoo_db_meta_v1";
const ADMIN_TOKEN_KEY = "kimjinsoo_admin_token_v1";

export const DEFAULT_STATE: DbState = {
  profile: {
    name: "김진수",
    tagline: "AICLab 대표 · AI 강사 · 비주얼라이즈 전문가",
    avatar: "",
  },
  websites: [
    { id: "w1", label: "AICLab 공식 홈페이지", url: "https://aiclab.kr", icon: "🌐" },
    { id: "w2", label: "포트폴리오", url: "", icon: "💼" },
    { id: "w3", label: "블로그", url: "", icon: "📝" },
  ],
  socials: [
    { id: "s1", platform: "YouTube", url: "" },
    { id: "s2", platform: "Instagram", url: "" },
    { id: "s3", platform: "LinkedIn", url: "" },
    { id: "s4", platform: "카카오채널", url: "" },
    { id: "s5", platform: "GitHub", url: "https://github.com/kjs369369" },
  ],
  workLinks: [],
  partners: [],
  footer: {
    phone: "010-0000-0000",
    email: "contact@aiclab.kr",
    business: "사업자등록번호: 000-00-00000",
    address: "대한민국",
  },
  programs: [],
  lectures: [],
};

export function loadState(): DbState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as DbState;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: DbState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function exportJson(state: DbState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kimjinsoo-db-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJson(file: File): Promise<DbState> {
  const text = await file.text();
  return JSON.parse(text) as DbState;
}

// ── 강의 이력 내보내기 ──

export function exportLecturesJson(lectures: Lecture[]) {
  download(
    JSON.stringify(lectures, null, 2),
    `lectures-${todayStr()}.json`,
    "application/json",
  );
}

export function exportLecturesCsv(lectures: Lecture[]) {
  const header = "날짜,종료일,기관,제목,유형,시수,담당자,이메일,전화,교육과정,상태,강의료,태그,메모";
  const rows = lectures.map((l) =>
    [
      l.date, l.endDate, q(l.organization), q(l.title),
      LECTURE_TYPE_META[l.lectureType]?.label ?? l.lectureType,
      l.hours, q(l.contactPerson), l.contactEmail, l.contactPhone,
      q(l.curriculum),
      LECTURE_STATUS_META[l.status]?.label ?? l.status,
      q(l.fee), q(l.tags.join(";")), q(l.description),
    ].join(","),
  );
  const bom = "\uFEFF";
  download(bom + [header, ...rows].join("\n"), `lectures-${todayStr()}.csv`, "text/csv");
}

export function exportLecturesText(lectures: Lecture[]) {
  const lines = lectures.map((l, i) => {
    const type = LECTURE_TYPE_META[l.lectureType]?.label ?? l.lectureType;
    const status = LECTURE_STATUS_META[l.status]?.label ?? l.status;
    return [
      `[${i + 1}] ${l.title}`,
      `    기관: ${l.organization}`,
      `    날짜: ${l.date}${l.endDate ? " ~ " + l.endDate : ""} (${type})`,
      `    시수: ${l.hours}시간  |  상태: ${status}${l.fee ? "  |  강의료: " + l.fee : ""}`,
      l.curriculum ? `    교육과정: ${l.curriculum}` : "",
      l.contactPerson ? `    담당자: ${l.contactPerson} / ${l.contactEmail} / ${l.contactPhone}` : "",
      l.tags.length ? `    태그: ${l.tags.join(", ")}` : "",
      l.description ? `    메모: ${l.description}` : "",
      l.attachments.length
        ? `    첨부(${l.attachments.length}): ${l.attachments.map((a) => a.name).join(", ")}`
        : "",
      "",
    ].filter(Boolean).join("\n");
  });
  const header = `=== 강의 출강 기록부 ===\n총 ${lectures.length}건 · 총 ${lectures.reduce((s, l) => s + (l.hours || 0), 0)}시간\n생성일: ${todayStr()}\n${"=".repeat(40)}\n\n`;
  download(header + lines.join("\n"), `lectures-${todayStr()}.txt`, "text/plain");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function q(s: string) {
  return `"${(s ?? "").replace(/"/g, '""')}"`;
}
function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Supabase 동기화 — 오프라인 캐시 + 클라우드 머지
// ─────────────────────────────────────────────

type StateWithTs = DbState & { _updatedAt?: number };

export function readLocalUpdatedAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return 0;
    const m = JSON.parse(raw) as { updatedAt?: number };
    return Number(m.updatedAt) || 0;
  } catch {
    return 0;
  }
}

export function writeLocalUpdatedAt(ts: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: ts }));
}

/**
 * local 과 cloud 두 상태를 timestamp 기준 last-write-wins 방식으로 머지.
 * 단일 사용자 가정 — 동시 편집 충돌은 무시한다.
 */
export function mergeStates(
  local: StateWithTs | null,
  cloud: StateWithTs | null,
): StateWithTs {
  if (!local && !cloud) return { ...DEFAULT_STATE, _updatedAt: 0 };
  if (!cloud) {
    return { ...DEFAULT_STATE, ...local!, _updatedAt: local!._updatedAt ?? 0 };
  }
  if (!local) {
    return { ...DEFAULT_STATE, ...cloud, _updatedAt: cloud._updatedAt ?? 0 };
  }
  const localTs = local._updatedAt ?? 0;
  const cloudTs = cloud._updatedAt ?? 0;
  return cloudTs > localTs
    ? { ...DEFAULT_STATE, ...cloud, _updatedAt: cloudTs }
    : { ...DEFAULT_STATE, ...local, _updatedAt: localTs };
}

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

type CloudFetchResult = {
  state: DbState;
  updatedAt: number;
};

/** Supabase에서 통합 상태(state + programs + lectures)를 한 번에 가져옴. */
export async function fetchFromCloud(): Promise<CloudFetchResult | null> {
  try {
    const [stateRes, programsRes, lecturesRes] = await Promise.all([
      fetch("/api/db/state", { cache: "no-store" }),
      fetch("/api/db/programs", { cache: "no-store" }),
      fetch("/api/db/lectures", { cache: "no-store" }),
    ]);
    if (!stateRes.ok || !programsRes.ok || !lecturesRes.ok) return null;
    const stateJson = await stateRes.json();
    const programsJson = await programsRes.json();
    const lecturesJson = await lecturesRes.json();
    if (!stateJson.ok || !programsJson.ok || !lecturesJson.ok) return null;
    const s = stateJson.data;
    const state: DbState = {
      profile: s.profile && Object.keys(s.profile).length ? s.profile : DEFAULT_STATE.profile,
      websites: Array.isArray(s.websites) && s.websites.length ? s.websites : DEFAULT_STATE.websites,
      socials: Array.isArray(s.socials) && s.socials.length ? s.socials : DEFAULT_STATE.socials,
      workLinks: Array.isArray(s.work_links) ? s.work_links : [],
      partners: Array.isArray(s.partners) ? s.partners : [],
      footer: s.footer && Object.keys(s.footer).length ? s.footer : DEFAULT_STATE.footer,
      programs: (programsJson.data || []) as Program[],
      lectures: (lecturesJson.data || []) as Lecture[],
    };
    return {
      state,
      updatedAt: new Date(s.updated_at).getTime(),
    };
  } catch {
    return null;
  }
}

/** 로컬 state 를 Supabase 에 PUT (programs/lectures 제외 — 별도 API). */
export async function pushStateToCloud(state: DbState): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/db/state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        profile: state.profile,
        websites: state.websites,
        socials: state.socials,
        work_links: state.workLinks,
        partners: state.partners,
        footer: state.footer,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** localStorage 즉시 저장 + debounced (1.5초) Supabase 푸시. */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function saveStateWithSync(state: DbState) {
  saveState(state);
  writeLocalUpdatedAt(Date.now());
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushStateToCloud(state).catch((err) => console.error("[sync] push 실패:", err));
  }, 1500);
}
