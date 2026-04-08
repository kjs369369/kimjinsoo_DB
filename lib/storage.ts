"use client";
import { DbState } from "./types";

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
  footer: {
    phone: "010-0000-0000",
    email: "contact@aiclab.kr",
    business: "사업자등록번호: 000-00-00000",
    address: "대한민국",
  },
  programs: [],
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
