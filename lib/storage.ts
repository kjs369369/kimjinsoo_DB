"use client";
import { DbState, Lecture, LECTURE_TYPE_META, LECTURE_STATUS_META } from "./types";

const KEY = "kimjinsoo_db_v1";

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
