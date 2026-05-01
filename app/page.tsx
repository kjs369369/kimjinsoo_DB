"use client";
import { useEffect, useState } from "react";
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
import { DbState, LinkItem, SocialItem } from "@/lib/types";

type SectionKey = "websites" | "socials" | "workLinks" | "partners";

const SECTION_META: Record<
  SectionKey,
  { title: string; emoji: string; addLabel: string }
> = {
  websites: { title: "Websites", emoji: "🌐", addLabel: "+ 홈페이지 추가" },
  socials: { title: "Socials", emoji: "📱", addLabel: "+ SNS 추가" },
  workLinks: { title: "업무용 카페 · 사이트", emoji: "💼", addLabel: "+ 업무링크 추가" },
  partners: { title: "제휴처", emoji: "🤝", addLabel: "+ 제휴처 추가" },
};

export default function MainPage() {
  const [state, setState] = useState<DbState>(DEFAULT_STATE);
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    websites: true,
    socials: true,
    workLinks: true,
    partners: true,
  });

  useEffect(() => {
    setState(loadState());
    setMounted(true);
    // 클라우드에서 최신 데이터 가져와 머지 (다른 PC의 변경 반영)
    fetchFromCloud().then((cloud) => {
      if (!cloud) return;
      const localTs = readLocalUpdatedAt();
      if (cloud.updatedAt > localTs) {
        setState(cloud.state);
        writeLocalUpdatedAt(cloud.updatedAt);
      }
    });
  }, []);

  useEffect(() => {
    if (mounted) saveStateWithSync(state);
  }, [state, mounted]);

  const update = (patch: Partial<DbState>) =>
    setState((s) => ({ ...s, ...patch }));

  const toggle = (key: SectionKey) =>
    setOpen((o) => ({ ...o, [key]: !o[key] }));

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const today = () => new Date().toISOString().slice(0, 10);

  if (!mounted) return null;

  const linkSections: { key: "websites" | "workLinks" | "partners" }[] = [
    { key: "websites" },
    { key: "workLinks" },
    { key: "partners" },
  ];

  return (
    <div className="space-y-10">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="uppercase">
            <span className="hero-line hero-white">KIMJINSOO</span>
            <span className="hero-line hero-blue">OFFICIAL</span>
            <span className="hero-line hero-red">HUB<span className="text-point">.</span></span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            모든 공식 링크와 연락처를 한 곳에서 관리합니다.
            <br />
            <span className="text-point font-semibold">
              클릭, 복사, 그리고 연결하세요.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            className={`btn ${
              editMode
                ? "text-white"
                : "border border-[var(--border)] bg-surface text-fg hover:border-[var(--point)] hover:text-[var(--point)]"
            }`}
            style={
              editMode
                ? { background: "linear-gradient(135deg, var(--point), #b30000)" }
                : undefined
            }
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "● 편집 중" : "✎ 편집 모드"}
          </button>
        </div>
      </div>

      {/* Profile */}
      <section className="card relative overflow-hidden p-8">
        <span className="absolute left-0 top-0 h-full w-1 bg-point" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative">
            {state.profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.profile.avatar}
                alt="avatar"
                className="h-24 w-24 rounded-2xl object-cover ring-2 ring-[var(--point)]"
              />
            ) : (
              <div
                className="grid h-24 w-24 place-items-center rounded-2xl text-2xl font-bold text-white ring-2 ring-[var(--point)]"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
              >
                {state.profile.name.slice(0, 2)}
              </div>
            )}
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-point ring-2 ring-[var(--bg)]" />
          </div>
          <div className="flex-1 space-y-2">
            {editMode ? (
              <>
                <input
                  className="input text-2xl font-bold"
                  value={state.profile.name}
                  onChange={(e) =>
                    update({
                      profile: { ...state.profile, name: e.target.value },
                    })
                  }
                />
                <input
                  className="input"
                  placeholder="한 줄 소개"
                  value={state.profile.tagline}
                  onChange={(e) =>
                    update({
                      profile: { ...state.profile, tagline: e.target.value },
                    })
                  }
                />
                <input
                  className="input"
                  placeholder="프로필 이미지 URL"
                  value={state.profile.avatar}
                  onChange={(e) =>
                    update({
                      profile: { ...state.profile, avatar: e.target.value },
                    })
                  }
                />
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold">{state.profile.name}</h2>
                <p className="text-muted">{state.profile.tagline}</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Link Sections (Websites / WorkLinks / Partners) */}
      {linkSections.map(({ key }) => {
        const meta = SECTION_META[key];
        const isOpen = open[key];
        const items = state[key];
        return (
          <section key={key}>
            <SectionHeader
              title={meta.title}
              emoji={meta.emoji}
              count={items.length}
              isOpen={isOpen}
              onToggle={() => toggle(key)}
              editMode={editMode}
              addLabel={meta.addLabel}
              onAdd={() =>
                update({
                  [key]: [
                    ...items,
                    {
                      id: uid(),
                      label: "새 링크",
                      url: "",
                      icon: "🔗",
                      createdAt: today(),
                      note: "",
                    },
                  ],
                } as Partial<DbState>)
              }
            />
            {isOpen && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.length === 0 && !editMode ? (
                  <div className="card col-span-full grid place-items-center p-10 text-xs text-muted">
                    등록된 항목이 없습니다.
                  </div>
                ) : (
                  items.map((w) => (
                    <LinkCard
                      key={w.id}
                      item={w}
                      editMode={editMode}
                      onChange={(next) =>
                        update({
                          [key]: items.map((x) => (x.id === w.id ? next : x)),
                        } as Partial<DbState>)
                      }
                      onDelete={() =>
                        update({
                          [key]: items.filter((x) => x.id !== w.id),
                        } as Partial<DbState>)
                      }
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Socials */}
      <section>
        <SectionHeader
          title={SECTION_META.socials.title}
          emoji={SECTION_META.socials.emoji}
          count={state.socials.length}
          isOpen={open.socials}
          onToggle={() => toggle("socials")}
          editMode={editMode}
          addLabel={SECTION_META.socials.addLabel}
          onAdd={() =>
            update({
              socials: [
                ...state.socials,
                {
                  id: uid(),
                  platform: "새 플랫폼",
                  url: "",
                  createdAt: today(),
                  note: "",
                },
              ],
            })
          }
        />
        {open.socials && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.socials.map((s) => (
              <SocialCard
                key={s.id}
                item={s}
                editMode={editMode}
                onChange={(next) =>
                  update({
                    socials: state.socials.map((x) =>
                      x.id === s.id ? next : x,
                    ),
                  })
                }
                onDelete={() =>
                  update({
                    socials: state.socials.filter((x) => x.id !== s.id),
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer Info */}
      <section>
        <div className="mb-4">
          <h3 className="section-title">Footer Info</h3>
          <p className="mt-1 text-xs text-muted">
            각 항목 클릭 시 클립보드로 복사됩니다.
          </p>
        </div>
        <div className="card grid gap-4 p-6 sm:grid-cols-2">
          {(
            [
              { key: "phone", label: "전화번호", icon: "📞" },
              { key: "email", label: "이메일", icon: "✉️" },
              { key: "business", label: "사업자정보", icon: "🏢" },
              { key: "address", label: "주소", icon: "📍" },
            ] as const
          ).map((f) => (
            <div key={f.key}>
              <div className="label">
                {f.icon} {f.label}
              </div>
              {editMode ? (
                <input
                  className="input"
                  value={state.footer[f.key]}
                  onChange={(e) =>
                    update({
                      footer: { ...state.footer, [f.key]: e.target.value },
                    })
                  }
                />
              ) : (
                <button
                  className="w-full truncate rounded-lg bg-surface px-3 py-2 text-left text-sm hover:bg-surface-2"
                  onClick={() => copy(state.footer[f.key])}
                  title="클릭하여 복사"
                >
                  {state.footer[f.key] || "—"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  emoji,
  count,
  isOpen,
  onToggle,
  editMode,
  addLabel,
  onAdd,
}: {
  title: string;
  emoji: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  editMode: boolean;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        onClick={onToggle}
        className="group flex items-center gap-3 text-left"
      >
        <span className="inline-block h-4 w-1 bg-point" />
        <span
          className={`inline-block text-xs text-muted transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          ▶
        </span>
        <h3 className="section-title !mb-0 group-hover:text-[var(--point)] transition">
          <span className="mr-1">{emoji}</span>
          {title}
        </h3>
        <span className="chip-point !py-0 !text-[10px]">{count}</span>
      </button>
      {editMode && isOpen && (
        <button className="btn-ghost text-xs" onClick={onAdd}>
          {addLabel}
        </button>
      )}
    </div>
  );
}

function LinkCard({
  item,
  editMode,
  onChange,
  onDelete,
}: {
  item: LinkItem;
  editMode: boolean;
  onChange: (next: LinkItem) => void;
  onDelete: () => void;
}) {
  if (editMode) {
    return (
      <div className="card space-y-2 p-4">
        <div className="flex gap-2">
          <input
            className="input w-16 text-center"
            value={item.icon || ""}
            onChange={(e) => onChange({ ...item, icon: e.target.value })}
            placeholder="🔗"
          />
          <input
            className="input flex-1"
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
            placeholder="라벨"
          />
        </div>
        <input
          className="input"
          value={item.url}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          placeholder="https://"
        />
        <div>
          <div className="label !mb-1">등록일</div>
          <input
            type="date"
            className="input"
            value={item.createdAt || ""}
            onChange={(e) => onChange({ ...item, createdAt: e.target.value })}
          />
        </div>
        <div>
          <div className="label !mb-1">메모</div>
          <textarea
            className="input min-h-[60px] text-xs"
            value={item.note || ""}
            onChange={(e) => onChange({ ...item, note: e.target.value })}
            placeholder="간단한 메모"
          />
        </div>
        <button className="btn-danger w-full text-xs" onClick={onDelete}>
          삭제
        </button>
      </div>
    );
  }
  return (
    <a
      href={item.url || "#"}
      target="_blank"
      rel="noreferrer"
      className="card flex flex-col gap-2 p-4"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{item.icon || "🔗"}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{item.label}</div>
          <div className="truncate text-xs text-muted">
            {item.url || "링크 없음"}
          </div>
        </div>
        <div className="text-muted">→</div>
      </div>
      {(item.createdAt || item.note) && (
        <div className="border-t border-[var(--border)] pt-2 text-[11px] text-muted space-y-1">
          {item.createdAt && <div>📅 {item.createdAt}</div>}
          {item.note && <div className="line-clamp-2">📝 {item.note}</div>}
        </div>
      )}
    </a>
  );
}

function SocialCard({
  item,
  editMode,
  onChange,
  onDelete,
}: {
  item: SocialItem;
  editMode: boolean;
  onChange: (next: SocialItem) => void;
  onDelete: () => void;
}) {
  if (editMode) {
    return (
      <div className="card space-y-2 p-4">
        <input
          className="input"
          value={item.platform}
          onChange={(e) => onChange({ ...item, platform: e.target.value })}
          placeholder="플랫폼 이름"
        />
        <input
          className="input"
          value={item.url}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          placeholder="https://"
        />
        <div>
          <div className="label !mb-1">등록일</div>
          <input
            type="date"
            className="input"
            value={item.createdAt || ""}
            onChange={(e) => onChange({ ...item, createdAt: e.target.value })}
          />
        </div>
        <div>
          <div className="label !mb-1">메모</div>
          <textarea
            className="input min-h-[60px] text-xs"
            value={item.note || ""}
            onChange={(e) => onChange({ ...item, note: e.target.value })}
            placeholder="간단한 메모"
          />
        </div>
        <button className="btn-danger w-full text-xs" onClick={onDelete}>
          삭제
        </button>
      </div>
    );
  }
  return (
    <a
      href={item.url || "#"}
      target="_blank"
      rel="noreferrer"
      className="card flex flex-col gap-2 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-[var(--primary)]">
            {item.platform}
          </div>
          <div className="mt-1 truncate text-sm text-fg">
            {item.url || "링크 없음"}
          </div>
        </div>
        <div className="text-muted">→</div>
      </div>
      {(item.createdAt || item.note) && (
        <div className="border-t border-[var(--border)] pt-2 text-[11px] text-muted space-y-1">
          {item.createdAt && <div>📅 {item.createdAt}</div>}
          {item.note && <div className="line-clamp-2">📝 {item.note}</div>}
        </div>
      )}
    </a>
  );
}
