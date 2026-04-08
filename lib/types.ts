export type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon?: string;
};

export type SocialItem = {
  id: string;
  platform: string;
  url: string;
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
