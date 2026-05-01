"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_STATE,
  exportJson,
  importJson,
  loadState,
  saveStateWithSync,
  fetchFromCloud,
  readLocalUpdatedAt,
  writeLocalUpdatedAt,
  uid,
} from "@/lib/storage";
import { createProgram, updateProgram, deleteProgram } from "@/lib/db-client";
import {
  CATEGORY_META,
  DbState,
  Program,
  ProgramCategory,
  ProgramStatus,
  STATUS_META,
} from "@/lib/types";

const EMPTY_PROGRAM: Omit<Program, "id"> = {
  name: "",
  category: "branding",
  description: "",
  url: "",
  thumbnail: "",
  tags: [],
  createdAt: new Date().toISOString().slice(0, 10),
  status: "wip",
  github: "",
  note: "",
};

export default function ProgramsPage() {
  const [state, setState] = useState<DbState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<ProgramCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: Program | null }>(
    { open: false, editing: null },
  );
  const [view, setView] = useState<Program | null>(null);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
    fetchFromCloud().then((cloud) => {
      if (!cloud) return;
      const localTs = readLocalUpdatedAt();
      if (cloud.updatedAt > localTs) {
        setState(cloud.state);
        writeLocalUpdatedAt(cloud.updatedAt);
      } else {
        // state-level은 local이 최신이지만 programs/lectures 는 항상 클라우드 신뢰
        setState((s) => ({ ...s, programs: cloud.state.programs, lectures: cloud.state.lectures }));
      }
    });
  }, []);

  useEffect(() => {
    if (mounted) saveStateWithSync(state);
  }, [state, mounted]);

  const filtered = useMemo(() => {
    return state.programs.filter((p) => {
      if (filter !== "all" && p.category !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.tags.some((t) => t.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [state.programs, filter, query]);

  const save = async (p: Program) => {
    const isUpdate = state.programs.some((x) => x.id === p.id);
    setState((s) => ({
      ...s,
      programs: isUpdate
        ? s.programs.map((x) => (x.id === p.id ? p : x))
        : [p, ...s.programs],
    }));
    setModal({ open: false, editing: null });
    const result = isUpdate ? await updateProgram(p) : await createProgram(p);
    if (!result) console.error("[programs] 클라우드 저장 실패 — 로컬에는 반영됨");
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    setState((s) => ({ ...s, programs: s.programs.filter((x) => x.id !== id) }));
    setView(null);
    const ok = await deleteProgram(id);
    if (!ok) console.error("[programs] 클라우드 삭제 실패 — 로컬에는 반영됨");
  };

  if (!mounted) return null;

  const categories: (ProgramCategory | "all")[] = [
    "all",
    "info",
    "event",
    "branding",
    "landing",
    "lecture",
    "lecture-mgmt",
    "student-case",
    "benchmark",
    "web-design",
    "tool-guide",
    "productivity",
    "ai-content",
    "etc",
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프로그램 아카이브</h1>
          <p className="mt-1 text-sm text-muted">
            제작한 웹페이지 · 프로그램을 누적 기록합니다. ({state.programs.length}개)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-ghost cursor-pointer">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const imported = await importJson(f);
                  setState(imported);
                  alert("불러오기 완료!");
                } catch {
                  alert("불러오기 실패");
                }
              }}
            />
            ⬆ 불러오기
          </label>
          <button className="btn-ghost" onClick={() => exportJson(state)}>
            ⬇ 내보내기
          </button>
          <a
            href="https://image-url-dusky.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="btn border border-[var(--border)] bg-surface text-fg hover:border-[var(--point)] hover:text-[var(--point)]"
            title="이미지를 업로드해서 URL로 변환하는 도구"
          >
            🖼️ 이미지 URL 생성기
          </a>
          <button
            className="btn-primary"
            onClick={() =>
              setModal({
                open: true,
                editing: { ...EMPTY_PROGRAM, id: uid() },
              })
            }
          >
            + 새 프로그램
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = filter === c;
            const label =
              c === "all" ? "전체" : CATEGORY_META[c as ProgramCategory].label;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-surface text-muted hover:border-[var(--primary)] hover:text-fg"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <input
          className="input"
          placeholder="🔍 이름, 설명, 태그로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card grid place-items-center p-16 text-center">
          <div className="text-5xl">📦</div>
          <p className="mt-4 text-sm text-muted">
            아직 기록된 프로그램이 없습니다.
          </p>
          <p className="text-xs text-muted">
            우측 상단 &quot;+ 새 프로그램&quot;으로 추가하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              onClick={() => setView(p)}
              onEdit={() => setModal({ open: true, editing: p })}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal.open && modal.editing && (
        <ProgramFormModal
          initial={modal.editing}
          onCancel={() => setModal({ open: false, editing: null })}
          onSave={save}
        />
      )}

      {/* View Modal */}
      {view && (
        <ViewModal
          program={view}
          onClose={() => setView(null)}
          onEdit={() => {
            setModal({ open: true, editing: view });
            setView(null);
          }}
          onDelete={() => remove(view.id)}
        />
      )}
    </div>
  );
}

function ProgramCard({
  program,
  onClick,
  onEdit,
}: {
  program: Program;
  onClick: () => void;
  onEdit: () => void;
}) {
  const cat = CATEGORY_META[program.category];
  const st = STATUS_META[program.status];
  return (
    <div className="card group overflow-hidden">
      <button onClick={onClick} className="block w-full text-left">
        <div
          className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${cat.color}`}
        >
          {program.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={program.thumbnail}
              alt={program.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-4xl opacity-30">
              {cat.label.slice(0, 2)}
            </div>
          )}
          <div className="absolute left-2 top-2 rounded-md bg-[rgba(0,0,0,0.6)] px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
            {cat.label}
          </div>
          <div
            className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${st.color}`}
          >
            {st.label}
          </div>
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold">{program.name}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] text-muted">
            {program.description || "설명 없음"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {program.tags.slice(0, 3).map((t) => (
              <span key={t} className="chip !px-1.5 !py-0.5 !text-[10px]">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5 text-[10px] text-muted">
        <span>{program.createdAt}</span>
        <button
          className="text-muted hover:text-[var(--primary)] transition"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          ✎ 편집
        </button>
      </div>
    </div>
  );
}

function ProgramFormModal({
  initial,
  onCancel,
  onSave,
}: {
  initial: Program;
  onCancel: () => void;
  onSave: (p: Program) => void;
}) {
  const [p, setP] = useState<Program>(initial);
  const [tagInput, setTagInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!p.tags.includes(t)) setP({ ...p, tags: [...p.tags, t] });
    setTagInput("");
  };

  const requestAISuggest = async () => {
    if (!p.name.trim()) {
      setAiError("먼저 프로그램 이름을 입력해주세요.");
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          category: p.category,
          url: p.url,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "AI 추천 실패");
        return;
      }
      setP((prev) => {
        const mergedTags = Array.from(
          new Set([...prev.tags, ...(data.tags || [])]),
        );
        return {
          ...prev,
          description: data.description || prev.description,
          tags: mergedTags,
        };
      });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.6)] p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">프로그램 {initial.name ? "편집" : "추가"}</h2>
          <button className="text-muted hover:text-fg" onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="label">이름 *</div>
            <input
              className="input"
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label">카테고리</div>
              <select
                className="input"
                value={p.category}
                onChange={(e) =>
                  setP({ ...p, category: e.target.value as ProgramCategory })
                }
              >
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k} className="bg-bg">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">상태</div>
              <select
                className="input"
                value={p.status}
                onChange={(e) =>
                  setP({ ...p, status: e.target.value as ProgramStatus })
                }
              >
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k} className="bg-bg">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="label !mb-0">설명 · 태그</div>
              <button
                type="button"
                onClick={requestAISuggest}
                disabled={aiLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--point)] bg-[color-mix(in_srgb,var(--point)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--point)] transition hover:bg-[color-mix(in_srgb,var(--point)_18%,transparent)] disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--point)] border-t-transparent" />
                    생성 중...
                  </>
                ) : (
                  <>✨ AI 추천받기</>
                )}
              </button>
            </div>
            {aiError && (
              <div className="mb-2 rounded-lg border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--danger)]">
                {aiError}
              </div>
            )}
            <textarea
              className="input min-h-[80px]"
              value={p.description}
              onChange={(e) => setP({ ...p, description: e.target.value })}
              placeholder="프로그램에 대한 간단한 설명 · 또는 AI 추천받기 버튼 클릭"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label">URL</div>
              <input
                className="input"
                value={p.url}
                onChange={(e) => setP({ ...p, url: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div>
              <div className="label">GitHub</div>
              <input
                className="input"
                value={p.github}
                onChange={(e) => setP({ ...p, github: e.target.value })}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <div className="label !mb-0">썸네일 이미지 URL</div>
                <a
                  href="https://image-url-dusky.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-semibold text-[var(--point)] hover:underline"
                  title="이미지 → URL 변환"
                >
                  🖼️ URL 생성기 열기 ↗
                </a>
              </div>
              <input
                className="input"
                value={p.thumbnail}
                onChange={(e) => setP({ ...p, thumbnail: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <div className="label">제작일</div>
              <input
                type="date"
                className="input"
                value={p.createdAt}
                onChange={(e) => setP({ ...p, createdAt: e.target.value })}
              />
            </div>
          </div>
          <div>
            <div className="label">태그</div>
            <div className="flex gap-2">
              <input
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="입력 후 Enter"
              />
              <button className="btn-ghost" onClick={addTag}>
                추가
              </button>
            </div>
            {p.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.tags.map((t) => (
                  <button
                    key={t}
                    className="chip hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    onClick={() =>
                      setP({ ...p, tags: p.tags.filter((x) => x !== t) })
                    }
                  >
                    #{t} ✕
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="label">메모 / 노트</div>
            <textarea
              className="input min-h-[80px]"
              value={p.note}
              onChange={(e) => setP({ ...p, note: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>
            취소
          </button>
          <button
            className="btn-primary"
            onClick={() => p.name.trim() && onSave(p)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({
  program,
  onClose,
  onEdit,
  onDelete,
}: {
  program: Program;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORY_META[program.category];
  const st = STATUS_META[program.status];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.6)] p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        {program.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={program.thumbnail}
            alt={program.name}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div
            className={`aspect-[16/9] w-full bg-gradient-to-br ${cat.color} grid place-items-center text-6xl opacity-30`}
          >
            {cat.label.slice(0, 2)}
          </div>
        )}
        <div className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="chip">{cat.label}</span>
            <span className={`chip ${st.color}`}>{st.label}</span>
            <span className="ml-auto text-xs text-muted">
              {program.createdAt}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{program.name}</h2>
          {program.description && (
            <p className="mt-2 text-sm text-fg">{program.description}</p>
          )}
          <div className="mt-4 space-y-2 text-sm">
            {program.url && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-muted">URL</span>
                <a
                  href={program.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[var(--primary)] hover:underline"
                >
                  {program.url}
                </a>
              </div>
            )}
            {program.github && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-muted">GitHub</span>
                <a
                  href={program.github}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[var(--primary)] hover:underline"
                >
                  {program.github}
                </a>
              </div>
            )}
          </div>
          {program.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {program.tags.map((t) => (
                <span key={t} className="chip">
                  #{t}
                </span>
              ))}
            </div>
          )}
          {program.note && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-surface p-3 text-sm text-fg whitespace-pre-wrap">
              {program.note}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-danger" onClick={onDelete}>
              삭제
            </button>
            <button className="btn-ghost" onClick={onClose}>
              닫기
            </button>
            <button className="btn-primary" onClick={onEdit}>
              ✎ 편집
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
