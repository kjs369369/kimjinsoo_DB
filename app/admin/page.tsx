"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SheetName,
  SheetSummary,
  fetchSummary,
  fetchSheet,
  isConnected,
  createRow,
  updateRow,
  deleteRow,
} from "@/lib/sheets";
import {
  CATEGORY_META,
  STATUS_META,
  LECTURE_TYPE_META,
  LECTURE_STATUS_META,
  Program,
  Lecture,
} from "@/lib/types";

const ADMIN_AUTH_KEY = "kimjinsoo_admin_auth_v1";

type SectionKey = "Main" | "Programs" | "Lectures" | "Vault";

const SECTION_META: Record<SectionKey, { label: string; icon: string; color: string }> = {
  Main: { label: "메인 링크", icon: "🏠", color: "from-blue-500 to-cyan-500" },
  Programs: { label: "프로그램", icon: "📦", color: "from-violet-500 to-purple-500" },
  Lectures: { label: "강의이력", icon: "🎓", color: "from-emerald-500 to-teal-500" },
  Vault: { label: "Vault", icon: "🔒", color: "from-amber-500 to-orange-500" },
};

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [summary, setSummary] = useState<SheetSummary | null>(null);
  const [activeTab, setActiveTab] = useState<SectionKey>("Programs");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 인증 확인
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ADMIN_AUTH_KEY) !== "1") {
      router.replace("/");
      return;
    }
    setAuthed(true);
  }, [router]);

  // 요약 로드
  useEffect(() => {
    if (!authed) return;
    if (!isConnected()) return;
    fetchSummary().then(setSummary).catch(console.error);
  }, [authed]);

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (!authed || !isConnected()) return;
    loadTab(activeTab);
  }, [authed, activeTab]);

  async function loadTab(tab: SectionKey) {
    setLoading(true);
    setSearch("");
    try {
      const data = await fetchSheet(tab as SheetName);
      setRows(data);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteRow(activeTab as SheetName, id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (summary) {
        setSummary({
          ...summary,
          [activeTab]: { count: (summary[activeTab]?.count || 1) - 1 },
        });
      }
    } catch (err) {
      alert("삭제 실패: " + (err as Error).message);
    }
  }

  async function handleSave(item: Record<string, unknown>) {
    try {
      if (editItem && editItem.id) {
        await updateRow(activeTab as SheetName, item);
        setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)));
      } else {
        const res = await createRow(activeTab as SheetName, item);
        item.id = res.id;
        setRows((prev) => [...prev, item]);
        if (summary) {
          setSummary({
            ...summary,
            [activeTab]: { count: (summary[activeTab]?.count || 0) + 1 },
          });
        }
      }
      setShowForm(false);
      setEditItem(null);
    } catch (err) {
      alert("저장 실패: " + (err as Error).message);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    router.replace("/");
  }

  // 검색 필터
  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return Object.values(r).some((v) =>
      String(v ?? "").toLowerCase().includes(s),
    );
  });

  if (!authed) return null;

  const connected = isConnected();

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Google Sheets 연동 관리자 페이지
          </p>
        </div>
        <div className="flex items-center gap-3">
          {connected ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Sheets 연결됨
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Sheets 미연결
            </span>
          )}
          <button className="btn text-xs" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 미연결 안내 */}
      {!connected && (
        <div className="card space-y-3 border-amber-500/30 p-6">
          <h3 className="font-semibold text-amber-400">Google Sheets 연결 필요</h3>
          <p className="text-sm text-muted">
            환경변수 <code className="rounded bg-surface px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GAS_URL</code>을 설정해주세요.
          </p>
          <div className="space-y-2 text-xs text-muted">
            <p>1. Google Sheets 새 파일 생성</p>
            <p>2. 확장 프로그램 → Apps Script 열기</p>
            <p>3. <code>gas/Code.gs</code> 코드 붙여넣기</p>
            <p>4. 배포 → 웹 앱 (실행: 나, 액세스: 모든 사용자)</p>
            <p>5. 배포 URL을 <code>NEXT_PUBLIC_GAS_URL</code>에 설정</p>
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.keys(SECTION_META) as SectionKey[]).map((key) => {
          const meta = SECTION_META[key];
          const count = summary?.[key]?.count ?? "—";
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`card cursor-pointer p-4 text-left transition-all ${
                isActive
                  ? "ring-2 ring-[var(--primary)]"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{meta.icon}</span>
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <p className="mt-2 text-sm font-medium">{meta.label}</p>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {connected && (
        <div className="space-y-4">
          {/* 툴바 */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="검색..."
              className="input w-full max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="btn-primary ml-auto text-sm"
              onClick={() => {
                setEditItem(null);
                setShowForm(true);
              }}
            >
              + 새 항목
            </button>
            <button
              className="btn text-sm"
              onClick={() => loadTab(activeTab)}
              disabled={loading}
            >
              {loading ? "..." : "새로고침"}
            </button>
          </div>

          {/* 데이터 테이블 */}
          {loading ? (
            <div className="py-20 text-center text-muted">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted">
              {rows.length === 0 ? "데이터가 없습니다" : "검색 결과 없음"}
            </div>
          ) : (
            <DataTable
              section={activeTab}
              rows={filtered}
              onEdit={(item) => {
                setEditItem(item);
                setShowForm(true);
              }}
              onDelete={(id) => handleDelete(id)}
            />
          )}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showForm && (
        <FormModal
          section={activeTab}
          item={editItem}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}

// ── 데이터 테이블 ──

function DataTable({
  section,
  rows,
  onEdit,
  onDelete,
}: {
  section: SectionKey;
  rows: Record<string, unknown>[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const columns = getDisplayColumns(section);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted"
              >
                {col.label}
              </th>
            ))}
            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
              작업
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={String(row.id || i)}
              className="border-b border-[var(--border)] hover:bg-surface/50"
            >
              {columns.map((col) => (
                <td key={col.key} className="max-w-[200px] truncate px-3 py-2.5">
                  {renderCell(section, col.key, row[col.key], row)}
                </td>
              ))}
              <td className="flex gap-1 px-3 py-2.5">
                <button
                  className="rounded px-2 py-1 text-xs hover:bg-surface"
                  onClick={() => onEdit(row)}
                >
                  수정
                </button>
                <button
                  className="rounded px-2 py-1 text-xs text-[var(--point)] hover:bg-surface"
                  onClick={() => onDelete(String(row.id))}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getDisplayColumns(section: SectionKey) {
  switch (section) {
    case "Main":
      return [
        { key: "section", label: "섹션" },
        { key: "label", label: "라벨" },
        { key: "url", label: "URL" },
        { key: "platform", label: "플랫폼" },
      ];
    case "Programs":
      return [
        { key: "name", label: "이름" },
        { key: "category", label: "카테고리" },
        { key: "status", label: "상태" },
        { key: "url", label: "URL" },
        { key: "createdAt", label: "제작일" },
      ];
    case "Lectures":
      return [
        { key: "date", label: "날짜" },
        { key: "organization", label: "기관" },
        { key: "title", label: "제목" },
        { key: "lectureType", label: "유형" },
        { key: "hours", label: "시수" },
        { key: "status", label: "상태" },
      ];
    case "Vault":
      return [
        { key: "section", label: "섹션" },
        { key: "title", label: "제목" },
        { key: "year", label: "연도" },
        { key: "url", label: "URL" },
      ];
  }
}

function renderCell(
  section: SectionKey,
  key: string,
  value: unknown,
  _row: Record<string, unknown>,
): React.ReactNode {
  const str = String(value ?? "");

  if (section === "Programs" && key === "category") {
    const meta = CATEGORY_META[str as keyof typeof CATEGORY_META];
    return meta ? (
      <span className="chip text-xs">{meta.label}</span>
    ) : (
      str
    );
  }
  if (section === "Programs" && key === "status") {
    const meta = STATUS_META[str as keyof typeof STATUS_META];
    return meta ? (
      <span className={`chip text-xs ${meta.color}`}>{meta.label}</span>
    ) : (
      str
    );
  }
  if (section === "Lectures" && key === "lectureType") {
    const meta = LECTURE_TYPE_META[str as keyof typeof LECTURE_TYPE_META];
    return meta ? `${meta.icon} ${meta.label}` : str;
  }
  if (section === "Lectures" && key === "status") {
    const meta = LECTURE_STATUS_META[str as keyof typeof LECTURE_STATUS_META];
    return meta ? (
      <span className={`chip text-xs ${meta.color}`}>{meta.label}</span>
    ) : (
      str
    );
  }
  if (key === "url" && str) {
    return (
      <a
        href={str}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent)] hover:underline"
      >
        {str.length > 30 ? str.slice(0, 30) + "..." : str}
      </a>
    );
  }
  return str || "—";
}

// ── 추가/수정 폼 모달 ──

function FormModal({
  section,
  item,
  onSave,
  onClose,
}: {
  section: SectionKey;
  item: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const fields = getFormFields(section);
  const [form, setForm] = useState<Record<string, unknown>>(
    item || Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""])),
  );
  const [saving, setSaving] = useState(false);

  function set(key: string, val: unknown) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        className="card mx-4 max-h-[80vh] w-full max-w-lg space-y-4 overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="text-lg font-bold">
          {item ? "항목 수정" : "새 항목 추가"} — {SECTION_META[section].label}
        </h3>

        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            {f.type === "select" ? (
              <select
                className="input w-full"
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              >
                <option value="">선택...</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                className="input w-full"
                rows={3}
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <input
                type={f.type || "text"}
                className="input w-full"
                value={String(form[f.key] ?? "")}
                onChange={(e) =>
                  set(
                    f.key,
                    f.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
                required={f.required}
              />
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn flex-1" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

type FieldDef = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
};

function getFormFields(section: SectionKey): FieldDef[] {
  switch (section) {
    case "Main":
      return [
        {
          key: "section",
          label: "섹션",
          type: "select",
          required: true,
          options: [
            { value: "websites", label: "웹사이트" },
            { value: "socials", label: "소셜" },
            { value: "workLinks", label: "워크링크" },
            { value: "partners", label: "파트너" },
          ],
        },
        { key: "label", label: "라벨", required: true },
        { key: "url", label: "URL" },
        { key: "icon", label: "아이콘" },
        { key: "platform", label: "플랫폼" },
        { key: "note", label: "메모", type: "textarea" },
      ];
    case "Programs":
      return [
        { key: "name", label: "이름", required: true },
        {
          key: "category",
          label: "카테고리",
          type: "select",
          options: Object.entries(CATEGORY_META).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
        },
        {
          key: "status",
          label: "상태",
          type: "select",
          options: Object.entries(STATUS_META).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
          defaultValue: "public",
        },
        { key: "description", label: "설명", type: "textarea" },
        { key: "url", label: "URL" },
        { key: "github", label: "GitHub URL" },
        { key: "thumbnail", label: "썸네일 URL" },
        { key: "tags", label: "태그 (쉼표 구분)" },
        { key: "createdAt", label: "제작일", type: "date" },
        { key: "note", label: "메모", type: "textarea" },
      ];
    case "Lectures":
      return [
        { key: "title", label: "강의 제목", required: true },
        { key: "organization", label: "기관", required: true },
        { key: "curriculum", label: "교육과정" },
        { key: "date", label: "시작일", type: "date" },
        { key: "endDate", label: "종료일", type: "date" },
        {
          key: "lectureType",
          label: "유형",
          type: "select",
          options: Object.entries(LECTURE_TYPE_META).map(([k, v]) => ({
            value: k,
            label: `${v.icon} ${v.label}`,
          })),
          defaultValue: "offline",
        },
        { key: "hours", label: "시수", type: "number" },
        {
          key: "status",
          label: "상태",
          type: "select",
          options: Object.entries(LECTURE_STATUS_META).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
          defaultValue: "scheduled",
        },
        { key: "fee", label: "강의료" },
        { key: "contactPerson", label: "담당자" },
        { key: "contactEmail", label: "담당자 이메일", type: "email" },
        { key: "contactPhone", label: "담당자 전화", type: "tel" },
        { key: "tags", label: "태그 (쉼표 구분)" },
        { key: "description", label: "메모", type: "textarea" },
      ];
    case "Vault":
      return [
        {
          key: "section",
          label: "섹션",
          type: "select",
          required: true,
          options: [
            { value: "profile", label: "프로필" },
            { value: "books", label: "도서" },
            { value: "artDirector", label: "아트디렉터" },
            { value: "certs", label: "자격/인증" },
            { value: "devProjects", label: "개발 프로젝트" },
            { value: "secret", label: "비밀" },
          ],
        },
        { key: "title", label: "제목", required: true },
        { key: "subtitle", label: "부제목" },
        { key: "year", label: "연도" },
        { key: "image", label: "이미지 URL" },
        { key: "url", label: "URL" },
        { key: "github", label: "GitHub URL" },
        { key: "note", label: "메모", type: "textarea" },
      ];
  }
}
