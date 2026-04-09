"use client";

export type VaultSectionKey =
  | "profile"
  | "books"
  | "artDirector"
  | "certs"
  | "devProjects"
  | "secret";

export type DocLink = {
  id: string;
  label: string;
  url: string;
};

export type VaultItem = {
  id: string;
  title: string;
  subtitle?: string;
  year?: string;
  image?: string;
  url?: string;
  note?: string;
  // Profile: 문서 링크 (이력서 · 포트폴리오 · 증명서 등)
  docs?: DocLink[];
  // Books: 온라인 서점 링크
  kyobo1?: string;
  kyobo2?: string;
  yes24?: string;
  aladin?: string;
  // Dev projects: 프로젝트 경로 · GitHub
  projectPath?: string;
  github?: string;
};

export type VaultState = {
  profile: VaultItem[];
  books: VaultItem[];
  artDirector: VaultItem[];
  certs: VaultItem[];
  devProjects: VaultItem[];
  secret: VaultItem[];
};

export const VAULT_SECTIONS: {
  key: VaultSectionKey;
  label: string;
  emoji: string;
  desc: string;
  subtitleLabel: string;
  fields: {
    subtitle?: boolean;
    year?: boolean;
    image?: boolean;
    url?: boolean;
    note?: boolean;
    docs?: boolean; // 프로필 전용: 문서 링크 리스트
    bookLinks?: boolean; // 저서 전용: 교보1, 교보2, 예스24, 알라딘
    devLinks?: boolean; // 개발 프로젝트 전용: 프로젝트 경로, GitHub
  };
}[] = [
  {
    key: "profile",
    label: "김진수 프로필",
    emoji: "👤",
    desc: "학력 · 경력 · 이력 · 주요 활동",
    subtitleLabel: "소속 / 역할",
    fields: {
      subtitle: true,
      year: true,
      image: true,
      note: true,
      docs: true,
    },
  },
  {
    key: "books",
    label: "저서",
    emoji: "📚",
    desc: "집필한 책 · 전자책 · 기고",
    subtitleLabel: "출판사",
    fields: {
      subtitle: true,
      year: true,
      image: true,
      note: true,
      bookLinks: true,
    },
  },
  {
    key: "artDirector",
    label: "아트디렉터",
    emoji: "🎨",
    desc: "아트디렉팅 · 브랜딩 · 비주얼 디렉션 작업",
    subtitleLabel: "클라이언트 / 프로젝트",
    fields: { subtitle: true, year: true, image: true, url: true, note: true },
  },
  {
    key: "certs",
    label: "자격 · 인증",
    emoji: "🏅",
    desc: "자격증 · 수료증 · 공식 인증",
    subtitleLabel: "발급 기관",
    fields: { subtitle: true, year: true, image: true, url: true, note: true },
  },
  {
    key: "devProjects",
    label: "개발 프로젝트",
    emoji: "💻",
    desc: "코딩 · 사이트 · 앱 · 실험 프로젝트",
    subtitleLabel: "기술 스택",
    fields: {
      subtitle: true,
      year: true,
      image: true,
      note: true,
      devLinks: true,
    },
  },
  {
    key: "secret",
    label: "시크릿 섹션",
    emoji: "🔒",
    desc: "오직 나만 아는 메모 · 비밀 링크 · 아이디어",
    subtitleLabel: "태그",
    fields: { subtitle: true, url: true, note: true },
  },
];

const KEY = "kimjinsoo_vault_v1";
export const VAULT_AUTH_KEY = "kimjinsoo_vault_auth_v1";

export const VAULT_DEFAULT: VaultState = {
  profile: [],
  books: [],
  artDirector: [],
  certs: [],
  devProjects: [],
  secret: [],
};

export function loadVault(): VaultState {
  if (typeof window === "undefined") return VAULT_DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return VAULT_DEFAULT;
    const parsed = JSON.parse(raw) as VaultState;
    return { ...VAULT_DEFAULT, ...parsed };
  } catch {
    return VAULT_DEFAULT;
  }
}

export function saveVault(state: VaultState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function vuid() {
  return Math.random().toString(36).slice(2, 10);
}

export function exportVaultJson(state: VaultState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kimjinsoo-vault-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importVaultJson(file: File): Promise<VaultState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as VaultState;
  return { ...VAULT_DEFAULT, ...parsed };
}
