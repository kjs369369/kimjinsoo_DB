"use client";
import { useEffect, useState } from "react";
import {
  DocLink,
  VAULT_AUTH_KEY,
  VAULT_DEFAULT,
  VAULT_SECTIONS,
  VaultItem,
  VaultSectionKey,
  VaultState,
  exportVaultJson,
  importVaultJson,
  loadVault,
  saveVault,
  vuid,
} from "@/lib/vault";

export default function VaultPage() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [state, setState] = useState<VaultState>(VAULT_DEFAULT);
  const [openSection, setOpenSection] = useState<Record<VaultSectionKey, boolean>>({
    profile: true,
    books: true,
    artDirector: true,
    certs: true,
    devProjects: true,
    secret: true,
  });
  const [editing, setEditing] = useState<{
    section: VaultSectionKey;
    item: VaultItem;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setAuthed(sessionStorage.getItem(VAULT_AUTH_KEY) === "1");
    }
    setState(loadVault());
  }, []);

  useEffect(() => {
    if (mounted && authed) saveVault(state);
  }, [state, mounted, authed]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/vault/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError("비밀번호가 틀렸습니다.");
        return;
      }
      sessionStorage.setItem(VAULT_AUTH_KEY, "1");
      setAuthed(true);
      setPassword("");
      if (data.isDefault) {
        alert(
          "⚠️ 기본 비밀번호(1234)로 인증되었습니다.\n.env.local에 VAULT_PASSWORD를 설정하세요!",
        );
      }
    } catch {
      setAuthError("인증 서버 오류");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(VAULT_AUTH_KEY);
    setAuthed(false);
  };

  const toggleSection = (key: VaultSectionKey) =>
    setOpenSection((o) => ({ ...o, [key]: !o[key] }));

  const saveItem = (section: VaultSectionKey, item: VaultItem) => {
    setState((s) => {
      const list = s[section];
      const exists = list.some((x) => x.id === item.id);
      return {
        ...s,
        [section]: exists
          ? list.map((x) => (x.id === item.id ? item : x))
          : [item, ...list],
      };
    });
    setEditing(null);
  };

  const removeItem = (section: VaultSectionKey, id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    setState((s) => ({ ...s, [section]: s[section].filter((x) => x.id !== id) }));
  };

  if (!mounted) return null;

  // ─────────────────────────────────────────
  // 인증 전: 비밀번호 게이트
  // ─────────────────────────────────────────
  if (!authed) {
    return (
      <div className="mx-auto max-w-md space-y-8 py-16">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔐</div>
          <h1 className="uppercase">
            <span className="hero-line hero-white">PRIVATE</span>
            <span className="hero-line hero-red">VAULT<span className="text-point">.</span></span>
          </h1>
          <p className="mt-4 text-sm text-muted">
            오직 김진수 본인만 접근할 수 있는 영역입니다.
            <br />
            <span className="text-point font-semibold">
              비밀번호를 입력하세요.
            </span>
          </p>
        </div>
        <form onSubmit={handleAuth} className="card space-y-3 p-6">
          <input
            type="password"
            className="input text-center text-lg tracking-[0.3em]"
            placeholder="● ● ● ●"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {authError && (
            <div className="rounded-lg border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-center text-sm text-[var(--danger)]">
              {authError}
            </div>
          )}
          <button
            type="submit"
            disabled={authLoading || !password}
            className="btn w-full text-white disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--point), #b30000)",
            }}
          >
            {authLoading ? "확인 중..." : "🔓 잠금 해제"}
          </button>
        </form>
        <p className="text-center text-[11px] text-muted">
          로컬 개발: 기본 비밀번호는 <code>1234</code>
          <br />
          배포 시 <code>.env.local</code>과 Vercel 환경변수에 <code>VAULT_PASSWORD</code> 설정 필수
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // 인증 후: 6개 섹션
  // ─────────────────────────────────────────
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="uppercase">
            <span className="hero-line hero-white">PRIVATE</span>
            <span className="hero-line hero-red">
              VAULT<span className="text-point">.</span>
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            김진수 개인 아카이브 — 프로필, 저서, 작업물, 자격, 프로젝트, 시크릿
            <br />
            <span className="text-point font-semibold">
              이 데이터는 오직 이 브라우저에만 저장됩니다.
            </span>
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
                  const imported = await importVaultJson(f);
                  setState(imported);
                  alert("Vault 불러오기 완료!");
                } catch {
                  alert("불러오기 실패");
                }
              }}
            />
            ⬆ 불러오기
          </label>
          <button className="btn-ghost" onClick={() => exportVaultJson(state)}>
            ⬇ 내보내기
          </button>
          <button className="btn-ghost" onClick={logout}>
            🔒 잠그기
          </button>
        </div>
      </div>

      {/* Sections */}
      {VAULT_SECTIONS.map((meta) => {
        const items = state[meta.key];
        const isOpen = openSection[meta.key];
        return (
          <section key={meta.key}>
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => toggleSection(meta.key)}
                className="group flex items-center gap-3 text-left"
              >
                <span className="inline-block h-5 w-1 bg-point" />
                <span
                  className={`inline-block text-xs text-muted transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                >
                  ▶
                </span>
                <div>
                  <h3 className="text-lg font-bold group-hover:text-[var(--point)] transition">
                    <span className="mr-2">{meta.emoji}</span>
                    {meta.label}
                    <span className="ml-2 chip-point !py-0 !text-[10px]">
                      {items.length}
                    </span>
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted">{meta.desc}</p>
                </div>
              </button>
              <button
                className="btn-ghost text-xs"
                onClick={() =>
                  setEditing({
                    section: meta.key,
                    item: { id: vuid(), title: "" },
                  })
                }
              >
                + 추가
              </button>
            </div>
            {isOpen && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.length === 0 ? (
                  <div className="card col-span-full grid place-items-center p-10 text-xs text-muted">
                    등록된 항목이 없습니다.
                  </div>
                ) : (
                  items.map((it) => (
                    <VaultCard
                      key={it.id}
                      item={it}
                      showImage={!!meta.fields.image}
                      onEdit={() => setEditing({ section: meta.key, item: it })}
                      onDelete={() => removeItem(meta.key, it.id)}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Edit modal */}
      {editing && (
        <VaultFormModal
          sectionKey={editing.section}
          initial={editing.item}
          onCancel={() => setEditing(null)}
          onSave={(item) => saveItem(editing.section, item)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
function VaultCard({
  item,
  showImage,
  onEdit,
  onDelete,
}: {
  item: VaultItem;
  showImage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const bookLinks = [
    { key: "kyobo1", label: "교보①", url: item.kyobo1 },
    { key: "kyobo2", label: "교보②", url: item.kyobo2 },
    { key: "yes24", label: "예스24", url: item.yes24 },
    { key: "aladin", label: "알라딘", url: item.aladin },
  ].filter((l) => !!l.url);

  return (
    <div className="card overflow-hidden">
      {showImage && item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.title}
          className="aspect-[16/9] w-full object-cover"
        />
      )}
      <div className="p-4">
        <h4 className="truncate text-sm font-semibold">{item.title || "—"}</h4>
        {item.subtitle && (
          <div className="mt-0.5 truncate text-xs text-muted">{item.subtitle}</div>
        )}
        {item.year && (
          <div className="mt-0.5 text-[11px] text-[var(--point)]">
            📅 {item.year}
          </div>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-[11px] text-[var(--primary)] hover:underline"
          >
            {item.url}
          </a>
        )}

        {/* Books: 서점 링크 칩 */}
        {bookLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {bookLinks.map((l) => (
              <a
                key={l.key}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--point)] bg-[color-mix(in_srgb,var(--point)_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--point)] hover:bg-[color-mix(in_srgb,var(--point)_20%,transparent)]"
              >
                📖 {l.label}
              </a>
            ))}
          </div>
        )}

        {/* Dev projects: 프로젝트 경로 + GitHub */}
        {(item.projectPath || item.github) && (
          <div className="mt-2 space-y-1 text-[11px]">
            {item.projectPath && (
              <a
                href={
                  item.projectPath.startsWith("http") ? item.projectPath : undefined
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-[var(--primary)] hover:underline"
                title={item.projectPath}
              >
                🌐 {item.projectPath}
              </a>
            )}
            {item.github && (
              <a
                href={item.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-[var(--primary)] hover:underline"
              >
                💻 GitHub
              </a>
            )}
          </div>
        )}

        {/* Profile: 문서 링크 리스트 */}
        {item.docs && item.docs.length > 0 && (
          <div className="mt-2 space-y-1">
            {item.docs.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-[11px] text-[var(--primary)] hover:underline"
              >
                📎 {d.label || d.url}
              </a>
            ))}
          </div>
        )}

        {item.note && (
          <p className="mt-2 line-clamp-3 text-[11px] text-muted whitespace-pre-wrap">
            {item.note}
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-[var(--border)] px-3 py-1.5 text-[11px]">
        <button className="text-muted hover:text-[var(--point)]" onClick={onEdit}>
          ✎ 편집
        </button>
        <span className="text-muted">·</span>
        <button className="text-muted hover:text-[var(--danger)]" onClick={onDelete}>
          삭제
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
function VaultFormModal({
  sectionKey,
  initial,
  onCancel,
  onSave,
}: {
  sectionKey: VaultSectionKey;
  initial: VaultItem;
  onCancel: () => void;
  onSave: (item: VaultItem) => void;
}) {
  const meta = VAULT_SECTIONS.find((s) => s.key === sectionKey)!;
  const [p, setP] = useState<VaultItem>(initial);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.6)] p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {meta.emoji} {meta.label} {initial.title ? "편집" : "추가"}
          </h2>
          <button className="text-muted hover:text-fg" onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="label">제목 *</div>
            <input
              className="input"
              value={p.title}
              onChange={(e) => setP({ ...p, title: e.target.value })}
              autoFocus
            />
          </div>
          {meta.fields.subtitle && (
            <div>
              <div className="label">{meta.subtitleLabel}</div>
              <input
                className="input"
                value={p.subtitle || ""}
                onChange={(e) => setP({ ...p, subtitle: e.target.value })}
              />
            </div>
          )}
          {meta.fields.year && (
            <div>
              <div className="label">연도 / 날짜</div>
              <input
                className="input"
                value={p.year || ""}
                onChange={(e) => setP({ ...p, year: e.target.value })}
                placeholder="2024 또는 2024-03"
              />
            </div>
          )}
          {meta.fields.image && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <div className="label !mb-0">이미지 URL</div>
                <a
                  href="https://image-url-dusky.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-semibold text-[var(--point)] hover:underline"
                >
                  🖼️ URL 생성기 ↗
                </a>
              </div>
              <input
                className="input"
                value={p.image || ""}
                onChange={(e) => setP({ ...p, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}
          {meta.fields.url && (
            <div>
              <div className="label">외부 링크</div>
              <input
                className="input"
                value={p.url || ""}
                onChange={(e) => setP({ ...p, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          {/* Books: 교보1, 교보2, 예스24, 알라딘 */}
          {meta.fields.bookLinks && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-surface p-3">
              <div className="text-xs font-semibold text-[var(--point)]">
                📖 온라인 서점 링크
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="label !mb-1">교보문고 #1</div>
                  <input
                    className="input"
                    value={p.kyobo1 || ""}
                    onChange={(e) => setP({ ...p, kyobo1: e.target.value })}
                    placeholder="https://product.kyobobook.co.kr/..."
                  />
                </div>
                <div>
                  <div className="label !mb-1">교보문고 #2</div>
                  <input
                    className="input"
                    value={p.kyobo2 || ""}
                    onChange={(e) => setP({ ...p, kyobo2: e.target.value })}
                    placeholder="https://product.kyobobook.co.kr/..."
                  />
                </div>
                <div>
                  <div className="label !mb-1">예스24</div>
                  <input
                    className="input"
                    value={p.yes24 || ""}
                    onChange={(e) => setP({ ...p, yes24: e.target.value })}
                    placeholder="https://www.yes24.com/..."
                  />
                </div>
                <div>
                  <div className="label !mb-1">알라딘</div>
                  <input
                    className="input"
                    value={p.aladin || ""}
                    onChange={(e) => setP({ ...p, aladin: e.target.value })}
                    placeholder="https://www.aladin.co.kr/..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dev projects: 프로젝트 경로, GitHub */}
          {meta.fields.devLinks && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-surface p-3">
              <div className="text-xs font-semibold text-[var(--point)]">
                💻 프로젝트 경로 · GitHub
              </div>
              <div>
                <div className="label !mb-1">프로젝트 경로 (데모 URL 또는 로컬)</div>
                <input
                  className="input"
                  value={p.projectPath || ""}
                  onChange={(e) => setP({ ...p, projectPath: e.target.value })}
                  placeholder="https://example.com 또는 C:/project/..."
                />
              </div>
              <div>
                <div className="label !mb-1">GitHub 저장소</div>
                <input
                  className="input"
                  value={p.github || ""}
                  onChange={(e) => setP({ ...p, github: e.target.value })}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
          )}

          {/* Profile: 문서 링크 리스트 */}
          {meta.fields.docs && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-surface p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[var(--point)]">
                  📎 문서 링크 (이력서 · 포트폴리오 · 증명서 등)
                </div>
                <button
                  type="button"
                  className="text-[10px] font-semibold text-[var(--point)] hover:underline"
                  onClick={() =>
                    setP({
                      ...p,
                      docs: [
                        ...(p.docs || []),
                        { id: vuid(), label: "", url: "" },
                      ],
                    })
                  }
                >
                  + 문서 추가
                </button>
              </div>
              {(p.docs || []).length === 0 ? (
                <p className="py-2 text-center text-[11px] text-muted">
                  Google Drive · Notion · Dropbox 등에 올린 문서 링크를 추가하세요
                </p>
              ) : (
                <div className="space-y-2">
                  {(p.docs || []).map((d) => (
                    <DocLinkRow
                      key={d.id}
                      doc={d}
                      onChange={(next) =>
                        setP({
                          ...p,
                          docs: (p.docs || []).map((x) =>
                            x.id === d.id ? next : x,
                          ),
                        })
                      }
                      onDelete={() =>
                        setP({
                          ...p,
                          docs: (p.docs || []).filter((x) => x.id !== d.id),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {meta.fields.note && (
            <div>
              <div className="label">메모 / 상세</div>
              <textarea
                className="input min-h-[100px]"
                value={p.note || ""}
                onChange={(e) => setP({ ...p, note: e.target.value })}
              />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>
            취소
          </button>
          <button
            className="btn-primary"
            onClick={() => p.title.trim() && onSave(p)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function DocLinkRow({
  doc,
  onChange,
  onDelete,
}: {
  doc: DocLink;
  onChange: (next: DocLink) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        className="input flex-1"
        value={doc.label}
        onChange={(e) => onChange({ ...doc, label: e.target.value })}
        placeholder="📄 문서 이름 (예: 2026 이력서)"
      />
      <input
        className="input flex-[2]"
        value={doc.url}
        onChange={(e) => onChange({ ...doc, url: e.target.value })}
        placeholder="https://drive.google.com/..."
      />
      <button
        type="button"
        className="btn-danger px-2 text-xs"
        onClick={onDelete}
        title="삭제"
      >
        ✕
      </button>
    </div>
  );
}
