"use client";
import { useEffect, useMemo, useState } from "react";
import {
  loadState,
  saveStateWithSync,
  fetchFromCloud,
  readLocalUpdatedAt,
  writeLocalUpdatedAt,
  uid,
  exportLecturesJson,
  exportLecturesCsv,
  exportLecturesText,
  DEFAULT_STATE,
} from "@/lib/storage";
import { createLecture, updateLecture, deleteLecture } from "@/lib/db-client";
import {
  DbState,
  Lecture,
  LectureAttachment,
  LectureType,
  LectureStatus,
  AttachmentType,
  LECTURE_TYPE_META,
  LECTURE_STATUS_META,
  ATTACHMENT_TYPE_META,
} from "@/lib/types";

// ─── 빈 강의 템플릿 ───
const EMPTY_LECTURE: Omit<Lecture, "id"> = {
  title: "",
  organization: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  lectureType: "offline",
  date: new Date().toISOString().slice(0, 10),
  endDate: "",
  hours: 0,
  curriculum: "",
  description: "",
  attachments: [],
  status: "scheduled",
  tags: [],
  fee: "",
  createdAt: new Date().toISOString().slice(0, 10),
};

// ─── 메인 페이지 ───
export default function LecturesPage() {
  const [state, setState] = useState<DbState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  // 필터
  const [statusFilter, setStatusFilter] = useState<LectureStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<LectureType | "all">("all");
  const [curriculumFilter, setCurriculumFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "org">("date");
  // 모달
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [viewLecture, setViewLecture] = useState<Lecture | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState(loadState());
    fetchFromCloud().then((cloud) => {
      if (cancelled) return;
      if (cloud && !cloud.isEmpty) {
        const localTs = readLocalUpdatedAt();
        if (cloud.updatedAt > localTs) {
          setState(cloud.state);
          writeLocalUpdatedAt(cloud.updatedAt);
        } else {
          setState((s) => ({
            ...s,
            programs: cloud.state.programs,
            lectures: cloud.state.lectures,
          }));
        }
      }
      setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => { if (mounted) saveStateWithSync(state); }, [state, mounted]);

  // 교육과정 목록 자동 수집
  const curricula = useMemo(() => {
    const set = new Set(state.lectures.map((l) => l.curriculum).filter(Boolean));
    return Array.from(set).sort();
  }, [state.lectures]);

  // 필터링
  const filtered = useMemo(() => {
    let arr = state.lectures;
    if (statusFilter !== "all") arr = arr.filter((l) => l.status === statusFilter);
    if (typeFilter !== "all") arr = arr.filter((l) => l.lectureType === typeFilter);
    if (curriculumFilter !== "all") arr = arr.filter((l) => l.curriculum === curriculumFilter);
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.organization.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.curriculum.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    arr = [...arr].sort((a, b) =>
      sortBy === "date"
        ? b.date.localeCompare(a.date)
        : a.organization.localeCompare(b.organization),
    );
    return arr;
  }, [state.lectures, statusFilter, typeFilter, curriculumFilter, query, sortBy]);

  // 통계
  const totalHours = state.lectures.reduce((s, l) => s + (l.hours || 0), 0);
  const thisYear = state.lectures.filter(
    (l) => l.date.startsWith(new Date().getFullYear().toString()),
  ).length;

  // CRUD
  const saveLecture = async (l: Lecture) => {
    const isUpdate = state.lectures.some((x) => x.id === l.id);
    setState((s) => ({
      ...s,
      lectures: isUpdate
        ? s.lectures.map((x) => (x.id === l.id ? l : x))
        : [l, ...s.lectures],
    }));
    const ok = isUpdate ? await updateLecture(l) : await createLecture(l);
    if (!ok) console.error("[lectures] 클라우드 저장 실패 — 로컬에는 반영됨");
  };
  const removeLecture = async (id: string) => {
    if (!confirm("이 강의 이력을 삭제하시겠습니까?")) return;
    setState((s) => ({ ...s, lectures: s.lectures.filter((x) => x.id !== id) }));
    const ok = await deleteLecture(id);
    if (!ok) console.error("[lectures] 클라우드 삭제 실패 — 로컬에는 반영됨");
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">강의 이력 관리</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip">총 {state.lectures.length}건</span>
            <span className="chip">올해 {thisYear}건</span>
            <span className="chip">총 {totalHours}시간</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            + 새 강의
          </button>
          <div className="relative">
            <button className="btn-ghost" onClick={(e) => {
              const menu = (e.currentTarget.nextElementSibling as HTMLElement);
              menu.classList.toggle("hidden");
            }}>
              ⬇ 내보내기
            </button>
            <div className="hidden absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border bg-bg p-1 shadow-lg" style={{ borderColor: "var(--border)" }}>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface" onClick={() => exportLecturesJson(filtered)}>JSON</button>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface" onClick={() => exportLecturesCsv(filtered)}>CSV (엑셀)</button>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface" onClick={() => exportLecturesText(filtered)}>텍스트</button>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="space-y-3">
        {/* 상태 탭 */}
        <div className="flex flex-wrap gap-1">
          {(["all", "completed", "scheduled", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                statusFilter === s
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-transparent bg-surface text-muted hover:text-fg"
              }`}
            >
              {s === "all" ? "전체" : LECTURE_STATUS_META[s].label}
            </button>
          ))}
          <span className="mx-1 self-center text-muted">|</span>
          {(["all", "offline", "online", "hybrid"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                typeFilter === t
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-transparent bg-surface text-muted hover:text-fg"
              }`}
            >
              {t === "all" ? "유형전체" : `${LECTURE_TYPE_META[t].icon} ${LECTURE_TYPE_META[t].label}`}
            </button>
          ))}
        </div>
        {/* 교육과정 + 검색 + 정렬 */}
        <div className="flex flex-wrap gap-2">
          {curricula.length > 0 && (
            <select
              value={curriculumFilter}
              onChange={(e) => setCurriculumFilter(e.target.value)}
              className="input max-w-[200px]"
            >
              <option value="all">교육과정 전체</option>
              {curricula.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <input
            className="input max-w-xs"
            placeholder="기관·제목·담당자·태그 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "org")} className="input max-w-[140px]">
            <option value="date">최신순</option>
            <option value="org">기관명순</option>
          </select>
        </div>
      </div>

      {/* 테이블 (데스크탑) / 카드 (모바일) */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl">📋</p>
          <p className="mt-4 text-sm text-muted">
            {state.lectures.length === 0
              ? "아직 강의 이력이 없습니다. '+ 새 강의' 버튼으로 추가하세요."
              : "검색 결과가 없습니다."}
          </p>
        </div>
      ) : (
        <>
          {/* 데스크탑 테이블 */}
          <div className="hidden overflow-x-auto rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface text-left text-xs uppercase tracking-wider text-muted" style={{ borderColor: "var(--border)" }}>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3">기관</th>
                  <th className="px-4 py-3">강의 제목</th>
                  <th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3">시수</th>
                  <th className="px-4 py-3">담당자</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">자료</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setViewLecture(l)}
                    className="cursor-pointer border-b transition hover:bg-surface"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{l.date}</td>
                    <td className="px-4 py-3 font-medium">{l.organization}</td>
                    <td className="max-w-[200px] truncate px-4 py-3">{l.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs">{LECTURE_TYPE_META[l.lectureType].icon} {LECTURE_TYPE_META[l.lectureType].label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{l.hours}h</td>
                    <td className="px-4 py-3 text-muted">{l.contactPerson || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${LECTURE_STATUS_META[l.status].color}`}>
                        {LECTURE_STATUS_META[l.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted">
                      {l.attachments.length > 0 ? `📎${l.attachments.length}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="space-y-3 md:hidden">
            {filtered.map((l) => (
              <div
                key={l.id}
                onClick={() => setViewLecture(l)}
                className="card cursor-pointer p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{l.title}</p>
                    <p className="mt-1 text-xs text-muted">{l.organization}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${LECTURE_STATUS_META[l.status].color}`}>
                    {LECTURE_STATUS_META[l.status].label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                  <span>{l.date}</span>
                  <span>{LECTURE_TYPE_META[l.lectureType].icon} {LECTURE_TYPE_META[l.lectureType].label}</span>
                  <span>{l.hours}h</span>
                  {l.attachments.length > 0 && <span>📎{l.attachments.length}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 폼 모달 */}
      {formOpen && (
        <LectureFormModal
          initial={editing}
          onSave={(l) => { saveLecture(l); setFormOpen(false); setEditing(null); }}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {/* 상세 모달 */}
      {viewLecture && (
        <LectureViewModal
          lecture={viewLecture}
          onClose={() => setViewLecture(null)}
          onEdit={(l) => { setViewLecture(null); setEditing(l); setFormOpen(true); }}
          onDelete={(id) => { removeLecture(id); setViewLecture(null); }}
          onUpdate={(l) => { saveLecture(l); setViewLecture(l); }}
        />
      )}
    </div>
  );
}

// ─── 폼 모달 ───
function LectureFormModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: Lecture | null;
  onSave: (l: Lecture) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<Lecture, "id">>(() =>
    initial ? { ...initial } : { ...EMPTY_LECTURE },
  );
  const [tagInput, setTagInput] = useState(initial?.tags.join(", ") ?? "");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.title.trim() || !form.organization.trim()) {
      alert("강의 제목과 기관명은 필수입니다.");
      return;
    }
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      ...(form as Lecture),
      id: initial?.id ?? uid(),
      tags,
      createdAt: initial?.createdAt ?? new Date().toISOString().slice(0, 10),
    } as Lecture);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-bg p-6" style={{ borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{initial ? "강의 이력 수정" : "새 강의 등록"}</h2>
          <button className="text-muted hover:text-fg" onClick={onCancel}>✕</button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">강의 제목 *</label>
            <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="예: AI 비주얼라이즈 실무 워크숍" />
          </div>
          <div>
            <label className="label">기관 / 단체 *</label>
            <input className="input" value={form.organization} onChange={(e) => set("organization", e.target.value)} placeholder="예: 한국AI전문가교육협회" />
          </div>
          <div>
            <label className="label">교육과정명</label>
            <input className="input" value={form.curriculum} onChange={(e) => set("curriculum", e.target.value)} placeholder="예: AI 비주얼라이즈 과정 3기" />
          </div>
          <div>
            <label className="label">강의 날짜</label>
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className="label">종료일 (다회차)</label>
            <input className="input" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </div>
          <div>
            <label className="label">유형</label>
            <select className="input" value={form.lectureType} onChange={(e) => set("lectureType", e.target.value as LectureType)}>
              {(Object.keys(LECTURE_TYPE_META) as LectureType[]).map((t) => (
                <option key={t} value={t}>{LECTURE_TYPE_META[t].icon} {LECTURE_TYPE_META[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">총 시수 (시간)</label>
            <input className="input" type="number" min={0} value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">상태</label>
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as LectureStatus)}>
              {(Object.keys(LECTURE_STATUS_META) as LectureStatus[]).map((s) => (
                <option key={s} value={s}>{LECTURE_STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">강의료</label>
            <input className="input" value={form.fee} onChange={(e) => set("fee", e.target.value)} placeholder="예: 500,000원" />
          </div>

          {/* 담당자 */}
          <div className="sm:col-span-2">
            <p className="section-title mb-2">담당자 정보</p>
          </div>
          <div>
            <label className="label">담당자명</label>
            <input className="input" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          </div>
          <div>
            <label className="label">이메일</label>
            <input className="input" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">전화번호</label>
            <input className="input" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          </div>

          {/* 태그 + 메모 */}
          <div className="sm:col-span-2">
            <label className="label">태그 (쉼표 구분)</label>
            <input className="input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="예: AI, 바이브코딩, 워크숍" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">메모 / 설명</label>
            <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── 상세 모달 ───
function LectureViewModal({
  lecture,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
}: {
  lecture: Lecture;
  onClose: () => void;
  onEdit: (l: Lecture) => void;
  onDelete: (id: string) => void;
  onUpdate: (l: Lecture) => void;
}) {
  const [attName, setAttName] = useState("");
  const [attType, setAttType] = useState<AttachmentType>("link");
  const [attUrl, setAttUrl] = useState("");
  const [attMemo, setAttMemo] = useState("");
  const [showAttForm, setShowAttForm] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const addAttachment = () => {
    if (!attName.trim()) return;
    const att: LectureAttachment = {
      id: uid(),
      name: attName,
      type: attType,
      url: attUrl,
      memo: attMemo,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    const updated = { ...lecture, attachments: [...lecture.attachments, att] };
    onUpdate(updated);
    setAttName(""); setAttUrl(""); setAttMemo(""); setShowAttForm(false);
  };

  const removeAttachment = (attId: string) => {
    const updated = { ...lecture, attachments: lecture.attachments.filter((a) => a.id !== attId) };
    onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-bg p-6" style={{ borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{lecture.title}</h2>
            <p className="mt-1 text-sm text-muted">{lecture.organization}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LECTURE_STATUS_META[lecture.status].color}`}>
              {LECTURE_STATUS_META[lecture.status].label}
            </span>
            <button className="text-muted hover:text-fg" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* 기본 정보 그리드 */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-3">
          <div>
            <span className="text-xs text-muted">날짜</span>
            <p className="font-mono">{lecture.date}{lecture.endDate ? ` ~ ${lecture.endDate}` : ""}</p>
          </div>
          <div>
            <span className="text-xs text-muted">유형</span>
            <p>{LECTURE_TYPE_META[lecture.lectureType].icon} {LECTURE_TYPE_META[lecture.lectureType].label}</p>
          </div>
          <div>
            <span className="text-xs text-muted">시수</span>
            <p>{lecture.hours}시간</p>
          </div>
          {lecture.curriculum && (
            <div className="col-span-2 sm:col-span-3">
              <span className="text-xs text-muted">교육과정</span>
              <p>{lecture.curriculum}</p>
            </div>
          )}
          {lecture.fee && (
            <div>
              <span className="text-xs text-muted">강의료</span>
              <p>{lecture.fee}</p>
            </div>
          )}
        </div>

        {/* 담당자 */}
        {lecture.contactPerson && (
          <div className="mt-4">
            <p className="section-title mb-2">담당자</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <button onClick={() => copy(lecture.contactPerson)} className="chip hover:bg-surface-2" title="복사">{lecture.contactPerson} 📋</button>
              {lecture.contactEmail && (
                <button onClick={() => copy(lecture.contactEmail)} className="chip hover:bg-surface-2" title="복사">📧 {lecture.contactEmail} 📋</button>
              )}
              {lecture.contactPhone && (
                <button onClick={() => copy(lecture.contactPhone)} className="chip hover:bg-surface-2" title="복사">📱 {lecture.contactPhone} 📋</button>
              )}
            </div>
          </div>
        )}

        {/* 태그 */}
        {lecture.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {lecture.tags.map((t) => (
              <span key={t} className="chip text-xs">#{t}</span>
            ))}
          </div>
        )}

        {/* 메모 */}
        {lecture.description && (
          <div className="mt-4 whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm">
            {lecture.description}
          </div>
        )}

        {/* 첨부 자료 */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="section-title">첨부 자료 ({lecture.attachments.length})</p>
            <button className="text-xs text-[var(--primary)] hover:underline" onClick={() => setShowAttForm(!showAttForm)}>
              {showAttForm ? "닫기" : "+ 자료 추가"}
            </button>
          </div>

          {showAttForm && (
            <div className="mt-3 space-y-2 rounded-xl border bg-surface p-4" style={{ borderColor: "var(--border)" }}>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" placeholder="자료명 *" value={attName} onChange={(e) => setAttName(e.target.value)} />
                <select className="input" value={attType} onChange={(e) => setAttType(e.target.value as AttachmentType)}>
                  {(Object.keys(ATTACHMENT_TYPE_META) as AttachmentType[]).map((t) => (
                    <option key={t} value={t}>{ATTACHMENT_TYPE_META[t].icon} {ATTACHMENT_TYPE_META[t].label}</option>
                  ))}
                </select>
              </div>
              <input className="input" placeholder="URL (드라이브, 이메일 링크 등)" value={attUrl} onChange={(e) => setAttUrl(e.target.value)} />
              <input className="input" placeholder="메모 (선택)" value={attMemo} onChange={(e) => setAttMemo(e.target.value)} />
              <button className="btn-primary text-xs" onClick={addAttachment}>추가</button>
            </div>
          )}

          {lecture.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {lecture.attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                  <span>{ATTACHMENT_TYPE_META[a.type]?.icon ?? "📎"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-[var(--primary)] hover:underline">
                        {a.url}
                      </a>
                    )}
                    {a.memo && <p className="text-xs text-muted">{a.memo}</p>}
                  </div>
                  <button className="text-xs text-[var(--danger)] hover:underline" onClick={() => removeAttachment(a.id)}>삭제</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-danger" onClick={() => onDelete(lecture.id)}>삭제</button>
          <button className="btn-primary" onClick={() => onEdit(lecture)}>편집</button>
        </div>
      </div>
    </div>
  );
}
