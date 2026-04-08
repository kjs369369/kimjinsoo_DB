"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_STATE,
  loadState,
  saveState,
  uid,
} from "@/lib/storage";
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
  }, []);

  useEffect(() => {
    if (mounted) saveState(state);
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

  const save = (p: Program) => {
    setState((s) => ({
      ...s,
      programs: s.programs.some((x) => x.id === p.id)
        ? s.programs.map((x) => (x.id === p.id ? p : x))
        : [p, ...s.programs],
    }));
    setModal({ open: false, editing: null });
  };

  const remove = (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    setState((s) => ({ ...s, programs: s.programs.filter((x) => x.id !== id) }));
    setView(null);
  };

  if (!mounted) return null;

  const categories: (ProgramCategory | "all")[] = [
    "all",
    "branding",
    "landing",
    "lecture",
    "productivity",
    "ai-content",
    "lecture-mgmt",
    "etc",
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프로그램 아카이브</h1>
          <p className="mt-1 text-sm text-slate-400">
            제작한 웹페이지 · 프로그램을 누적 기록합니다. ({state.programs.length}개)
          </p>
        </div>
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
                    ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
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
          <p className="mt-4 text-sm text-slate-400">
            아직 기록된 프로그램이 없습니다.
          </p>
          <p className="text-xs text-slate-500">
            우측 상단 &quot;+ 새 프로그램&quot;으로 추가하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-[10px] font-semibold backdrop-blur">
            {cat.label}
          </div>
          <div
            className={`absolute right-3 top-3 rounded-md px-2 py-1 text-[10px] font-semibold ${st.color}`}
          >
            {st.label}
          </div>
        </div>
        <div className="p-4">
          <h3 className="truncate text-base font-semibold">{program.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
            {program.description || "설명 없음"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {program.tags.slice(0, 4).map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-white/5 px-4 py-2 text-[11px] text-slate-500">
        <span>{program.createdAt}</span>
        <button
          className="text-slate-400 hover:text-brand-cyan"
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

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!p.tags.includes(t)) setP({ ...p, tags: [...p.tags, t] });
    setTagInput("");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">프로그램 {initial.name ? "편집" : "추가"}</h2>
          <button className="text-slate-400 hover:text-white" onClick={onCancel}>
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
                  <option key={k} value={k} className="bg-brand-navy">
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
                  <option key={k} value={k} className="bg-brand-navy">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="label">설명</div>
            <textarea
              className="input min-h-[80px]"
              value={p.description}
              onChange={(e) => setP({ ...p, description: e.target.value })}
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
              <div className="label">썸네일 이미지 URL</div>
              <input
                className="input"
                value={p.thumbnail}
                onChange={(e) => setP({ ...p, thumbnail: e.target.value })}
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
                    className="chip hover:border-red-400/40 hover:text-red-300"
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
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
            <span className="ml-auto text-xs text-slate-500">
              {program.createdAt}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{program.name}</h2>
          {program.description && (
            <p className="mt-2 text-sm text-slate-300">{program.description}</p>
          )}
          <div className="mt-4 space-y-2 text-sm">
            {program.url && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-slate-500">URL</span>
                <a
                  href={program.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-brand-cyan hover:underline"
                >
                  {program.url}
                </a>
              </div>
            )}
            {program.github && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-slate-500">GitHub</span>
                <a
                  href={program.github}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-brand-cyan hover:underline"
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
            <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3 text-sm text-slate-300 whitespace-pre-wrap">
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
