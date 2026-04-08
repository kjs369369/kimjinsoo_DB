"use client";
import { useEffect, useState } from "react";
import {
  DEFAULT_STATE,
  exportJson,
  importJson,
  loadState,
  saveState,
  uid,
} from "@/lib/storage";
import { DbState, LinkItem, SocialItem } from "@/lib/types";

export default function MainPage() {
  const [state, setState] = useState<DbState>(DEFAULT_STATE);
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveState(state);
  }, [state, mounted]);

  const update = (patch: Partial<DbState>) =>
    setState((s) => ({ ...s, ...patch }));

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            브랜딩 &amp; 링크 허브
          </h1>
          <p className="mt-1 text-sm text-muted">
            모든 공식 링크와 연락처를 한 곳에서 관리합니다.
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
            className={editMode ? "btn-primary" : "btn-ghost"}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "✓ 편집 중" : "✎ 편집 모드"}
          </button>
        </div>
      </div>

      {/* Profile */}
      <section className="card p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative">
            {state.profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.profile.avatar}
                alt="avatar"
                className="h-24 w-24 rounded-2xl object-cover ring-2 ring-[var(--primary)]"
              />
            ) : (
              <div
                className="grid h-24 w-24 place-items-center rounded-2xl text-2xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
              >
                {state.profile.name.slice(0, 2)}
              </div>
            )}
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

      {/* Websites */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title">Websites</h3>
          {editMode && (
            <button
              className="btn-ghost text-xs"
              onClick={() =>
                update({
                  websites: [
                    ...state.websites,
                    { id: uid(), label: "새 링크", url: "", icon: "🔗" },
                  ],
                })
              }
            >
              + 추가
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.websites.map((w) => (
            <LinkCard
              key={w.id}
              item={w}
              editMode={editMode}
              onChange={(next) =>
                update({
                  websites: state.websites.map((x) =>
                    x.id === w.id ? next : x,
                  ),
                })
              }
              onDelete={() =>
                update({
                  websites: state.websites.filter((x) => x.id !== w.id),
                })
              }
            />
          ))}
        </div>
      </section>

      {/* Socials */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title">Socials</h3>
          {editMode && (
            <button
              className="btn-ghost text-xs"
              onClick={() =>
                update({
                  socials: [
                    ...state.socials,
                    { id: uid(), platform: "새 플랫폼", url: "" },
                  ],
                })
              }
            >
              + 추가
            </button>
          )}
        </div>
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
      className="card flex items-center gap-3 p-4"
    >
      <div className="text-2xl">{item.icon || "🔗"}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{item.label}</div>
        <div className="truncate text-xs text-muted">
          {item.url || "링크 없음"}
        </div>
      </div>
      <div className="text-muted">→</div>
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
      className="card flex items-center justify-between p-4"
    >
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--primary)]">
          {item.platform}
        </div>
        <div className="mt-1 truncate text-sm text-fg">
          {item.url || "링크 없음"}
        </div>
      </div>
      <div className="text-muted">→</div>
    </a>
  );
}
