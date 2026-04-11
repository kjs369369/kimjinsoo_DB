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

// ── 강의 이력 ──
export type LectureType = "offline" | "online" | "hybrid";
export type LectureStatus = "completed" | "scheduled" | "cancelled";
export type AttachmentType = "email" | "document" | "link" | "image" | "etc";

export type LectureAttachment = {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  memo: string;
  addedAt: string;
};

export type Lecture = {
  id: string;
  title: string;
  organization: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  lectureType: LectureType;
  date: string;
  endDate: string;
  hours: number;
  curriculum: string;
  description: string;
  attachments: LectureAttachment[];
  status: LectureStatus;
  tags: string[];
  fee: string;
  createdAt: string;
};

export type DbState = {
  profile: Profile;
  websites: LinkItem[];
  socials: SocialItem[];
  workLinks: LinkItem[];
  partners: LinkItem[];
  footer: FooterInfo;
  programs: Program[];
  lectures: Lecture[];
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

export const LECTURE_TYPE_META: Record<
  LectureType,
  { label: string; icon: string }
> = {
  offline: { label: "오프라인", icon: "🏫" },
  online: { label: "온라인", icon: "💻" },
  hybrid: { label: "하이브리드", icon: "🔀" },
};

export const LECTURE_STATUS_META: Record<
  LectureStatus,
  { label: string; color: string }
> = {
  completed: { label: "완료", color: "bg-emerald-500/20 text-emerald-300" },
  scheduled: { label: "예정", color: "bg-sky-500/20 text-sky-300" },
  cancelled: { label: "취소", color: "bg-red-500/20 text-red-300" },
};

export const ATTACHMENT_TYPE_META: Record<
  AttachmentType,
  { label: string; icon: string }
> = {
  email: { label: "이메일", icon: "📧" },
  document: { label: "문서", icon: "📄" },
  link: { label: "링크", icon: "🔗" },
  image: { label: "이미지", icon: "🖼️" },
  etc: { label: "기타", icon: "📎" },
};
