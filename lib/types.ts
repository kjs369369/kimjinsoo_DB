export type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon?: string;
  createdAt?: string;
  note?: string;
};

export type SocialItem = {
  id: string;
  platform: string;
  url: string;
  createdAt?: string;
  note?: string;
};

export type Profile = {
  name: string;
  tagline: string;
  avatar: string;
};

export type FooterInfo = {
  phone: string;
  email: string;
  business: string;
  address: string;
};

export type ProgramCategory =
  | "branding"
  | "landing"
  | "lecture"
  | "productivity"
  | "ai-content"
  | "lecture-mgmt"
  | "info"
  | "event"
  | "student-case"
  | "benchmark"
  | "web-design"
  | "tool-guide"
  | "etc";

export type ProgramStatus = "public" | "private" | "wip";

export type Program = {
  id: string;
  name: string;
  category: ProgramCategory;
  description: string;
  url: string;
  thumbnail: string;
  tags: string[];
  createdAt: string;
  status: ProgramStatus;
  github: string;
  note: string;
};

export type DbState = {
  profile: Profile;
  websites: LinkItem[];
  socials: SocialItem[];
  workLinks: LinkItem[];
  partners: LinkItem[];
  footer: FooterInfo;
  programs: Program[];
};

export const CATEGORY_META: Record<
  ProgramCategory,
  { label: string; color: string }
> = {
  branding: { label: "브랜딩", color: "from-pink-500 to-rose-500" },
  landing: { label: "랜딩페이지", color: "from-amber-500 to-orange-500" },
  lecture: { label: "강의용", color: "from-cyan-500 to-sky-500" },
  productivity: { label: "업무생산성", color: "from-emerald-500 to-teal-500" },
  "ai-content": { label: "AI콘텐츠", color: "from-violet-500 to-indigo-500" },
  "lecture-mgmt": { label: "강의관리", color: "from-fuchsia-500 to-purple-500" },
  info: { label: "안내", color: "from-sky-400 to-blue-600" },
  event: { label: "행사", color: "from-red-500 to-orange-500" },
  "student-case": { label: "수강생사례", color: "from-lime-500 to-green-600" },
  benchmark: { label: "벤치마킹", color: "from-yellow-500 to-amber-600" },
  "web-design": { label: "웹디자인", color: "from-teal-400 to-cyan-600" },
  "tool-guide": { label: "Tool가이드", color: "from-indigo-500 to-blue-700" },
  etc: { label: "기타", color: "from-slate-500 to-slate-600" },
};

export const STATUS_META: Record<
  ProgramStatus,
  { label: string; color: string }
> = {
  public: { label: "공개", color: "bg-emerald-500/20 text-emerald-300" },
  private: { label: "비공개", color: "bg-slate-500/20 text-slate-300" },
  wip: { label: "작업중", color: "bg-amber-500/20 text-amber-300" },
};
