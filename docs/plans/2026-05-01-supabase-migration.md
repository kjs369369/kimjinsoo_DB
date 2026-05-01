# Supabase 마이그레이션 — 멀티기기 동기화 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** localStorage 기반 단일 기기 저장소를 Supabase 클라우드 DB로 전환하여, 어떤 PC·노트북·태블릿에서 접속해도 동일한 데이터를 보고 기록할 수 있게 한다.

**Architecture:** **하이브리드 스키마**(자주 검색·필터하는 `programs`/`lectures`만 정규화, 나머지는 단일 JSONB 컬럼) + **기존 비밀번호 게이트 재활용**(클라이언트는 anon 키로 read-only, write는 Next.js API 라우트가 service_role 키로 처리) + **오프라인 캐시 동기화**(localStorage를 1차 캐시로 유지하면서 Supabase와 last-write-wins 머지). 기존 Google Apps Script(GAS) 인프라는 마이그레이션 후 제거한다.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Supabase (Postgres + JS SDK) · Vitest (신규 도입) · Tailwind CSS

---

## 사전 결정 사항 (사용자 확인 완료)
- **스키마**: 하이브리드 (옵션 1-C)
- **인증**: 기존 `VAULT_PASSWORD` + sessionStorage 게이트 재활용 (옵션 2-A)
- **저장 시점**: localStorage 즉시 + Supabase debounced sync (옵션 3-C)

## Phase 별 개요

| Phase | 내용 | 예상 시간 |
|---|---|---|
| 0 | Supabase 프로젝트 생성, 환경변수, 패키지, 테스트 인프라 | 30분 |
| 1 | DB 스키마 SQL 작성 및 적용 | 30분 |
| 2 | Supabase 클라이언트 (브라우저 + 서버) | 30분 |
| 3 | 인증 미들웨어 + 토큰 발급 API | 30분 |
| 4 | API 라우트 — `/api/db/state`, `/api/db/programs`, `/api/db/lectures` | 1.5시간 |
| 5 | 클라이언트 데이터 레이어 재작성 (`lib/storage.ts`) | 1시간 |
| 6 | 페이지 마이그레이션 (`/`, `/programs`, `/admin`, `/vault`) | 1.5시간 |
| 7 | localStorage → Supabase 자동 마이그레이션 스크립트 | 30분 |
| 8 | GAS 인프라 정리 + 환경변수 Vercel 설정 | 30분 |
| 9 | 멀티 디바이스 검증 + 문서 업데이트 | 30분 |

**총 예상 시간**: 7시간 내외 (단계별 검증 포함)

---

## Phase 0 — 사전 준비

### Task 0.1: Supabase 프로젝트 생성 (사용자 수동 작업)

**누가**: 사용자

**해야 할 일**:
1. https://supabase.com 로그인
2. 새 프로젝트 생성:
   - 이름: `kimjinsoo-db`
   - 리전: `Northeast Asia (Seoul)` 또는 `Tokyo`
   - DB 비밀번호: 강력한 비밀번호 생성 후 1Password 등에 저장
3. 프로젝트 생성 완료 후 **Settings → API**에서 다음 3가지 복사:
   - `Project URL` (예: `https://xxxxx.supabase.co`)
   - `anon public` 키
   - `service_role` 키 (절대 클라이언트에 노출 금지)
4. 위 3개 값을 다음 step에서 `.env.local`에 입력

**완료 조건**: Supabase 대시보드에서 빈 프로젝트 확인 가능

---

### Task 0.2: 환경변수 설정

**Files:**
- Modify: `.env.local` (gitignore되어 있음 — 없으면 생성)
- Modify: `.env.local.example` (없으면 생성, git에 커밋)

**Step 1: `.env.local` 작성**

```bash
# 기존 변수
VAULT_PASSWORD=<기존 값 유지>
NEXT_PUBLIC_GAS_URL=<기존 값 유지 — Phase 8에서 제거 예정>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Step 2: `.env.local.example` 작성 (커밋용)**

```bash
VAULT_PASSWORD=
NEXT_PUBLIC_GAS_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Step 3: `.gitignore` 확인**

`.env.local`이 `.gitignore`에 포함되어 있는지 검증. Next.js 기본 `.gitignore`는 포함하지만 직접 확인.

```bash
grep -E "\.env" .gitignore
```

기대: `.env*.local` 또는 유사 패턴이 출력됨.

**Step 4: 커밋**

```bash
git add .env.local.example .gitignore
git commit -m "chore: Supabase 환경변수 템플릿 추가"
```

---

### Task 0.3: Supabase JS SDK 설치

**Step 1: 설치**

```bash
cd C:/Users/kjs36/kimjinsoo_DB
npm install @supabase/supabase-js
```

**Step 2: 검증**

```bash
npm list @supabase/supabase-js
```

기대: `@supabase/supabase-js@2.x.x` 출력

**Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "feat: @supabase/supabase-js 추가"
```

---

### Task 0.4: Vitest 테스트 환경 세팅

현재 테스트 프레임워크가 없음. Supabase 로직(특히 머지/동기화)은 위험 부분이라 핵심 함수만 단위 테스트.

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts 추가)

**Step 1: 패키지 설치**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

**Step 2: `vitest.config.ts` 생성**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

**Step 3: `tests/setup.ts` 생성**

```ts
import "@testing-library/jest-dom";
```

**Step 4: `package.json` scripts 수정**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

**Step 5: smoke 테스트 작성**

`tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("vitest works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 6: 실행 검증**

```bash
npm run test:run
```

기대: `1 passed` 출력

**Step 7: 커밋**

```bash
git add vitest.config.ts tests/ package.json package-lock.json
git commit -m "test: Vitest 도입 및 smoke 테스트"
```

---

## Phase 1 — DB 스키마

### Task 1.1: 스키마 SQL 작성

**Files:**
- Create: `supabase/migrations/0001_initial.sql`

**설계 근거**:
- `state` 테이블: 단일 행(`id='me'`)에 profile/websites/socials/workLinks/partners/footer를 JSONB로 저장. 검색 안 하므로 정규화 불필요.
- `programs`, `lectures` 테이블: 검색·필터·통계 욕구가 있으므로 정규화.
- `lecture_attachments`: lecture와 1:N 관계 — 별도 테이블.
- `updated_at` 컬럼: 충돌 머지에 필수.

**Step 1: SQL 파일 작성**

`supabase/migrations/0001_initial.sql`:

```sql
-- ─────────────────────────────────────────────
-- 0001_initial.sql — Supabase 초기 스키마
-- 단일 사용자 대시보드용. RLS는 활성화하되 정책은
-- service_role만 통과하도록 좁게 설정한다.
-- ─────────────────────────────────────────────

-- ── 1) 통합 상태 (싱글톤 행) ──
create table if not exists public.state (
  id text primary key default 'me' check (id = 'me'),
  profile jsonb not null default '{}'::jsonb,
  websites jsonb not null default '[]'::jsonb,
  socials jsonb not null default '[]'::jsonb,
  work_links jsonb not null default '[]'::jsonb,
  partners jsonb not null default '[]'::jsonb,
  footer jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 초기 행 삽입 (없으면)
insert into public.state (id) values ('me')
  on conflict (id) do nothing;

-- ── 2) 프로그램 ──
create table if not exists public.programs (
  id text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  url text not null default '',
  thumbnail text not null default '',
  tags jsonb not null default '[]'::jsonb,
  created_at text not null default '',
  status text not null default 'public',
  github text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists programs_category_idx on public.programs (category);
create index if not exists programs_status_idx on public.programs (status);

-- ── 3) 강의 이력 ──
create table if not exists public.lectures (
  id text primary key,
  title text not null,
  organization text not null default '',
  contact_person text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  lecture_type text not null default 'offline',
  date text not null default '',
  end_date text not null default '',
  hours numeric not null default 0,
  curriculum text not null default '',
  description text not null default '',
  status text not null default 'completed',
  tags jsonb not null default '[]'::jsonb,
  fee text not null default '',
  created_at text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists lectures_date_idx on public.lectures (date);
create index if not exists lectures_status_idx on public.lectures (status);
create index if not exists lectures_type_idx on public.lectures (lecture_type);

-- ── 4) 강의 첨부파일 ──
create table if not exists public.lecture_attachments (
  id text primary key,
  lecture_id text not null references public.lectures(id) on delete cascade,
  name text not null default '',
  type text not null default 'etc',
  url text not null default '',
  memo text not null default '',
  added_at text not null default ''
);

create index if not exists lecture_attachments_lecture_id_idx
  on public.lecture_attachments (lecture_id);

-- ── 5) updated_at 자동 갱신 트리거 ──
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists state_touch on public.state;
create trigger state_touch before update on public.state
  for each row execute function public.touch_updated_at();

drop trigger if exists programs_touch on public.programs;
create trigger programs_touch before update on public.programs
  for each row execute function public.touch_updated_at();

drop trigger if exists lectures_touch on public.lectures;
create trigger lectures_touch before update on public.lectures
  for each row execute function public.touch_updated_at();

-- ── 6) RLS — 모든 테이블에 활성화, anon은 SELECT만 가능 ──
alter table public.state enable row level security;
alter table public.programs enable row level security;
alter table public.lectures enable row level security;
alter table public.lecture_attachments enable row level security;

-- 누구나 읽기 가능 (공개 대시보드)
create policy "anyone can select state"
  on public.state for select using (true);
create policy "anyone can select programs"
  on public.programs for select using (true);
create policy "anyone can select lectures"
  on public.lectures for select using (true);
create policy "anyone can select lecture_attachments"
  on public.lecture_attachments for select using (true);

-- 쓰기는 RLS 우회하는 service_role만 가능 (정책 미작성 = 차단)
```

**Step 2: 커밋**

```bash
git add supabase/migrations/
git commit -m "feat: Supabase 초기 스키마 추가"
```

---

### Task 1.2: 스키마 적용 — Supabase 대시보드에서 실행

**누가**: 사용자 + Claude (Claude가 스크립트 안내)

**Step 1: SQL 에디터에서 실행**

1. Supabase 대시보드 → **SQL Editor** → **+ New query**
2. `supabase/migrations/0001_initial.sql` 전체 내용 복사·붙여넣기
3. **Run** 클릭
4. 모든 명령이 성공으로 표시되는지 확인

**Step 2: 검증 — Table Editor에서 확인**

Supabase 대시보드 → **Table Editor**에서 다음 4개 테이블 표시 확인:
- `state` (1 row, id=`me`)
- `programs` (0 rows)
- `lectures` (0 rows)
- `lecture_attachments` (0 rows)

**완료 조건**: 4개 테이블 모두 가시, RLS 활성화 표시(자물쇠 아이콘)

---

## Phase 2 — Supabase 클라이언트 셋업

### Task 2.1: 브라우저 클라이언트 생성

**Files:**
- Create: `lib/supabase-browser.ts`

**Step 1: 파일 작성**

```ts
"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (cached) return cached;
  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
```

**Step 2: 커밋**

```bash
git add lib/supabase-browser.ts
git commit -m "feat: Supabase 브라우저 클라이언트"
```

---

### Task 2.2: 서버 클라이언트 생성 (service_role)

**Files:**
- Create: `lib/supabase-server.ts`

**Step 1: 파일 작성**

```ts
import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase 서버 환경변수 누락 — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 확인",
    );
  }
  if (cached) return cached;
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
```

**Step 2: 커밋**

```bash
git add lib/supabase-server.ts
git commit -m "feat: Supabase 서버 클라이언트 (service_role)"
```

---

## Phase 3 — 인증 미들웨어

기존 `app/api/vault/auth/route.ts`는 비밀번호 검증만 하고 sessionStorage에 마커만 남긴다. 클라이언트가 임의로 sessionStorage를 조작할 수 있으니, **API 호출 시 비밀번호를 매번 헤더에 동봉**하는 방식이 더 안전하다. 다만 단일 사용자 사이드 프로젝트 수준이므로 다음과 같이 한다:

- 클라이언트는 비밀번호 검증 후 받은 **단기 세션 토큰**(서명된 JWT 또는 random string)을 sessionStorage에 저장
- 모든 쓰기 API 호출 시 `Authorization: Bearer <token>` 헤더로 전송
- API 라우트는 토큰을 검증

### Task 3.1: 세션 토큰 발급/검증 헬퍼

**Files:**
- Create: `lib/admin-token.ts`

**Step 1: 의존성 — `crypto.randomUUID` 사용 (Node 18+ 내장, 별도 패키지 불필요)**

**Step 2: 파일 작성**

```ts
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * 단일 사용자용 단기 세션 토큰.
 * 비밀번호 검증 통과 후 발급, 24시간 유효.
 * VAULT_PASSWORD를 HMAC 키로 사용 (별도 secret 관리 회피).
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24시간

function getSecret(): string {
  const pw = process.env.VAULT_PASSWORD;
  if (!pw) throw new Error("VAULT_PASSWORD not set");
  return pw;
}

export function issueAdminToken(): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `admin.${expiresAt}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== "admin") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const payload = `${role}.${expStr}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
```

**Step 3: 단위 테스트 작성**

`tests/admin-token.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";

beforeEach(() => {
  process.env.VAULT_PASSWORD = "test-password-12345";
});

describe("admin-token", () => {
  it("발급한 토큰을 검증할 수 있다", async () => {
    const { issueAdminToken, verifyAdminToken } = await import("@/lib/admin-token");
    const token = issueAdminToken();
    expect(verifyAdminToken(token)).toBe(true);
  });

  it("위조된 토큰은 거부한다", async () => {
    const { verifyAdminToken } = await import("@/lib/admin-token");
    expect(verifyAdminToken("admin.9999999999999.abc123")).toBe(false);
  });

  it("형식이 잘못된 토큰은 거부한다", async () => {
    const { verifyAdminToken } = await import("@/lib/admin-token");
    expect(verifyAdminToken("garbage")).toBe(false);
    expect(verifyAdminToken(null)).toBe(false);
    expect(verifyAdminToken("")).toBe(false);
  });

  it("만료된 토큰은 거부한다", async () => {
    const { issueAdminToken, verifyAdminToken } = await import("@/lib/admin-token");
    const token = issueAdminToken();
    const [role, _exp, sig] = token.split(".");
    const expired = `${role}.${Date.now() - 1000}.${sig}`;
    expect(verifyAdminToken(expired)).toBe(false);
  });
});
```

**Step 4: 테스트 실행**

```bash
npm run test:run -- tests/admin-token.test.ts
```

기대: 4 passed

**Step 5: 커밋**

```bash
git add lib/admin-token.ts tests/admin-token.test.ts
git commit -m "feat: 어드민 단기 세션 토큰 (HMAC 기반)"
```

---

### Task 3.2: 기존 `vault/auth` API에서 토큰 발급

**Files:**
- Modify: `app/api/vault/auth/route.ts`

**Step 1: 토큰 발급 추가**

기존 응답 `{ ok: true, isDefault }`에 `token` 필드 추가.

```ts
import { NextResponse } from "next/server";
import { issueAdminToken } from "@/lib/admin-token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input: string = (body?.password || "").toString();

    const expected = process.env.VAULT_PASSWORD || "1234";

    if (input.length !== expected.length) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= input.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (mismatch !== 0) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      isDefault: !process.env.VAULT_PASSWORD,
      token: issueAdminToken(),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
```

**Step 2: `AdminAuth.tsx` 수정 — 토큰 저장**

`components/AdminAuth.tsx`:

```ts
const ADMIN_AUTH_KEY = "kimjinsoo_admin_auth_v1";
const ADMIN_TOKEN_KEY = "kimjinsoo_admin_token_v1";

// handleSubmit 안에서:
if (data.ok) {
  sessionStorage.setItem(ADMIN_AUTH_KEY, "1");
  sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);  // ← 추가
  // ...
}
```

또한 `useAdminGate()`도 그대로 유지(읽기 전용 게이트). 토큰 가져오는 헬퍼 추가:

```ts
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}
```

**Step 3: 빌드 검증**

```bash
npx tsc --noEmit
```

기대: 에러 없음

**Step 4: 커밋**

```bash
git add app/api/vault/auth/route.ts components/AdminAuth.tsx
git commit -m "feat: 비밀번호 검증 시 어드민 토큰 발급/저장"
```

---

## Phase 4 — API 라우트

### Task 4.1: `/api/db/state` — 통합 상태 GET/PUT

**Files:**
- Create: `app/api/db/state/route.ts`

**Step 1: 파일 작성**

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("state")
    .select("*")
    .eq("id", "me")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: Request) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  // 화이트리스트: 허용 필드만 통과
  const allowed = ["profile", "websites", "socials", "work_links", "partners", "footer"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "empty patch" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("state")
    .update(patch)
    .eq("id", "me")
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
```

**Step 2: 수동 테스트**

```bash
npm run dev
```

별도 터미널에서:

```bash
# GET (인증 불필요)
curl http://localhost:3000/api/db/state

# PUT (토큰 필요 — 일단 401 확인)
curl -X PUT http://localhost:3000/api/db/state \
  -H "Content-Type: application/json" \
  -d '{"profile":{"name":"테스트"}}'
```

기대: GET은 200 + 빈 데이터, PUT은 401

**Step 3: 커밋**

```bash
git add app/api/db/state/route.ts
git commit -m "feat: /api/db/state GET/PUT 라우트"
```

---

### Task 4.2: `/api/db/programs` — CRUD

**Files:**
- Create: `app/api/db/programs/route.ts` (GET, POST)
- Create: `app/api/db/programs/[id]/route.ts` (PUT, DELETE)

**Step 1: 컬럼 매핑 헬퍼 작성**

`lib/db-mappers.ts`:

```ts
import { Program, Lecture, LectureAttachment } from "./types";

// camelCase ↔ snake_case 변환

export function programToRow(p: Program) {
  return {
    id: p.id, name: p.name, category: p.category, description: p.description,
    url: p.url, thumbnail: p.thumbnail, tags: p.tags, created_at: p.createdAt,
    status: p.status, github: p.github, note: p.note,
  };
}

export function rowToProgram(r: Record<string, unknown>): Program {
  return {
    id: String(r.id), name: String(r.name),
    category: r.category as Program["category"],
    description: String(r.description), url: String(r.url),
    thumbnail: String(r.thumbnail),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    createdAt: String(r.created_at),
    status: r.status as Program["status"],
    github: String(r.github), note: String(r.note),
  };
}

export function lectureToRow(l: Lecture) {
  return {
    id: l.id, title: l.title, organization: l.organization,
    contact_person: l.contactPerson, contact_email: l.contactEmail,
    contact_phone: l.contactPhone, lecture_type: l.lectureType,
    date: l.date, end_date: l.endDate, hours: l.hours,
    curriculum: l.curriculum, description: l.description,
    status: l.status, tags: l.tags, fee: l.fee, created_at: l.createdAt,
  };
}

export function rowToLecture(
  r: Record<string, unknown>,
  attachments: LectureAttachment[] = [],
): Lecture {
  return {
    id: String(r.id), title: String(r.title),
    organization: String(r.organization),
    contactPerson: String(r.contact_person),
    contactEmail: String(r.contact_email),
    contactPhone: String(r.contact_phone),
    lectureType: r.lecture_type as Lecture["lectureType"],
    date: String(r.date), endDate: String(r.end_date),
    hours: Number(r.hours), curriculum: String(r.curriculum),
    description: String(r.description), attachments,
    status: r.status as Lecture["status"],
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    fee: String(r.fee), createdAt: String(r.created_at),
  };
}

export function attachmentToRow(lectureId: string, a: LectureAttachment) {
  return {
    id: a.id, lecture_id: lectureId, name: a.name,
    type: a.type, url: a.url, memo: a.memo, added_at: a.addedAt,
  };
}

export function rowToAttachment(r: Record<string, unknown>): LectureAttachment {
  return {
    id: String(r.id), name: String(r.name),
    type: r.type as LectureAttachment["type"],
    url: String(r.url), memo: String(r.memo), addedAt: String(r.added_at),
  };
}
```

**Step 2: 매퍼 단위 테스트**

`tests/db-mappers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  programToRow, rowToProgram, lectureToRow, rowToLecture,
} from "@/lib/db-mappers";

describe("db-mappers", () => {
  it("Program ↔ row 왕복 변환", () => {
    const p = {
      id: "p1", name: "테스트", category: "branding" as const,
      description: "설명", url: "https://x", thumbnail: "",
      tags: ["a", "b"], createdAt: "2026-05-01", status: "public" as const,
      github: "", note: "",
    };
    expect(rowToProgram(programToRow(p))).toEqual(p);
  });

  it("Lecture ↔ row 왕복 변환 (첨부 제외)", () => {
    const l = {
      id: "l1", title: "강의", organization: "기관",
      contactPerson: "담당", contactEmail: "a@b", contactPhone: "010",
      lectureType: "online" as const, date: "2026-05-01", endDate: "",
      hours: 2, curriculum: "과정", description: "메모",
      attachments: [], status: "completed" as const,
      tags: ["x"], fee: "100000", createdAt: "2026-05-01",
    };
    expect(rowToLecture(lectureToRow(l))).toEqual(l);
  });
});
```

```bash
npm run test:run -- tests/db-mappers.test.ts
```

기대: 2 passed

**Step 3: `/api/db/programs/route.ts` 작성**

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import { programToRow, rowToProgram } from "@/lib/db-mappers";
import { Program } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: (data ?? []).map(rowToProgram) });
}

export async function POST(req: Request) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Program;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("programs")
    .insert(programToRow(body))
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: rowToProgram(data) });
}
```

**Step 4: `/api/db/programs/[id]/route.ts` 작성**

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import { programToRow, rowToProgram } from "@/lib/db-mappers";
import { Program } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Partial<Program>;
  const supabase = getSupabaseAdmin();
  const row = programToRow({ ...(body as Program), id: params.id });
  const { id: _ignore, ...patch } = row;
  const { data, error } = await supabase
    .from("programs")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: rowToProgram(data) });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("programs").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Step 5: 수동 검증**

```bash
npm run dev
curl http://localhost:3000/api/db/programs
```

기대: `{"ok":true,"data":[]}`

**Step 6: 커밋**

```bash
git add lib/db-mappers.ts tests/db-mappers.test.ts app/api/db/programs/
git commit -m "feat: /api/db/programs CRUD 라우트"
```

---

### Task 4.3: `/api/db/lectures` — CRUD (첨부 포함)

**Files:**
- Create: `app/api/db/lectures/route.ts`
- Create: `app/api/db/lectures/[id]/route.ts`

강의는 `lecture_attachments`와 1:N이라 GET/POST/PUT 시 첨부도 함께 처리해야 한다.

**Step 1: `app/api/db/lectures/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import {
  lectureToRow, rowToLecture, attachmentToRow, rowToAttachment,
} from "@/lib/db-mappers";
import { Lecture } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data: lectures, error: lerr } = await supabase
    .from("lectures").select("*").order("date", { ascending: false });
  if (lerr) return NextResponse.json({ ok: false, error: lerr.message }, { status: 500 });

  const { data: atts, error: aerr } = await supabase
    .from("lecture_attachments").select("*");
  if (aerr) return NextResponse.json({ ok: false, error: aerr.message }, { status: 500 });

  const byLecture = new Map<string, ReturnType<typeof rowToAttachment>[]>();
  for (const a of atts ?? []) {
    const id = String(a.lecture_id);
    if (!byLecture.has(id)) byLecture.set(id, []);
    byLecture.get(id)!.push(rowToAttachment(a));
  }

  const result = (lectures ?? []).map((l) =>
    rowToLecture(l, byLecture.get(String(l.id)) ?? []),
  );
  return NextResponse.json({ ok: true, data: result });
}

export async function POST(req: Request) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Lecture;
  const supabase = getSupabaseAdmin();

  const { error: lerr } = await supabase.from("lectures").insert(lectureToRow(body));
  if (lerr) return NextResponse.json({ ok: false, error: lerr.message }, { status: 500 });

  if (body.attachments?.length) {
    const rows = body.attachments.map((a) => attachmentToRow(body.id, a));
    const { error: aerr } = await supabase.from("lecture_attachments").insert(rows);
    if (aerr) return NextResponse.json({ ok: false, error: aerr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 2: `app/api/db/lectures/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import { lectureToRow, attachmentToRow } from "@/lib/db-mappers";
import { Lecture } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Lecture;
  const supabase = getSupabaseAdmin();

  const { id: _ignore, ...patch } = lectureToRow(body);
  const { error: lerr } = await supabase
    .from("lectures").update(patch).eq("id", params.id);
  if (lerr) return NextResponse.json({ ok: false, error: lerr.message }, { status: 500 });

  // 첨부는 전부 삭제 후 재삽입 (단순함 우선, 단일 사용자라 OK)
  await supabase.from("lecture_attachments").delete().eq("lecture_id", params.id);
  if (body.attachments?.length) {
    const rows = body.attachments.map((a) => attachmentToRow(params.id, a));
    const { error: aerr } = await supabase.from("lecture_attachments").insert(rows);
    if (aerr) return NextResponse.json({ ok: false, error: aerr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  // FK on delete cascade로 첨부도 자동 삭제
  const { error } = await supabase.from("lectures").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Step 3: 수동 검증**

```bash
curl http://localhost:3000/api/db/lectures
```

기대: `{"ok":true,"data":[]}`

**Step 4: 커밋**

```bash
git add app/api/db/lectures/
git commit -m "feat: /api/db/lectures CRUD 라우트 (첨부 포함)"
```

---

## Phase 5 — 클라이언트 데이터 레이어 재작성

### Task 5.1: 새 storage 모듈 — 오프라인 캐시 + Supabase 동기화

**Files:**
- Modify: `lib/storage.ts` (큰 변경)

**핵심 설계**:
- `loadState()`: localStorage 즉시 반환(동기 — 기존 시그니처 유지) + 백그라운드에서 `fetchFromCloud()` 호출 → 새 데이터 도착 시 콜백.
- `saveState()`: localStorage 즉시 + debounced `pushToCloud()` 호출.
- 충돌 머지: `state.updated_at`을 비교해서 최신값 사용. 단일 사용자라 단순화.

**Step 1: 단위 테스트 먼저 작성** — `tests/storage-merge.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mergeStates } from "@/lib/storage";

describe("mergeStates", () => {
  it("cloud 가 더 최신이면 cloud 채택", () => {
    const local = { profile: { name: "old" }, _updatedAt: 100 };
    const cloud = { profile: { name: "new" }, _updatedAt: 200 };
    const merged = mergeStates(local as any, cloud as any);
    expect(merged.profile.name).toBe("new");
  });

  it("local 이 더 최신이면 local 채택", () => {
    const local = { profile: { name: "newer" }, _updatedAt: 300 };
    const cloud = { profile: { name: "older" }, _updatedAt: 200 };
    const merged = mergeStates(local as any, cloud as any);
    expect(merged.profile.name).toBe("newer");
  });

  it("local 또는 cloud 중 하나만 있으면 그것을 사용", () => {
    const local = { profile: { name: "local" }, _updatedAt: 100 };
    expect(mergeStates(local as any, null).profile.name).toBe("local");
    expect(mergeStates(null, local as any).profile.name).toBe("local");
  });
});
```

```bash
npm run test:run -- tests/storage-merge.test.ts
```

기대: FAIL (mergeStates not exported)

**Step 2: `lib/storage.ts` 재작성**

기존 export(`loadState`, `saveState`, `uid`, `exportJson`, `importJson`, `exportLectures*`)는 그대로 유지. 다음을 추가:

```ts
"use client";
import { DbState } from "./types";
// (기존 export들 유지)

const KEY = "kimjinsoo_db_v1";
const META_KEY = "kimjinsoo_db_meta_v1";

type Meta = { updatedAt: number };

function readMeta(): Meta {
  if (typeof window === "undefined") return { updatedAt: 0 };
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : { updatedAt: 0 };
  } catch {
    return { updatedAt: 0 };
  }
}

function writeMeta(m: Meta) {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify(m));
}

// ── 기존 loadState/saveState 옆에 추가 ──

export function mergeStates(
  local: (DbState & { _updatedAt?: number }) | null,
  cloud: (DbState & { _updatedAt?: number }) | null,
): DbState & { _updatedAt: number } {
  if (!local && !cloud) return { ...DEFAULT_STATE, _updatedAt: 0 };
  if (!cloud) return { ...DEFAULT_STATE, ...local!, _updatedAt: local!._updatedAt ?? 0 };
  if (!local) return { ...DEFAULT_STATE, ...cloud, _updatedAt: cloud._updatedAt ?? 0 };
  const localTs = local._updatedAt ?? 0;
  const cloudTs = cloud._updatedAt ?? 0;
  return cloudTs > localTs
    ? { ...DEFAULT_STATE, ...cloud, _updatedAt: cloudTs }
    : { ...DEFAULT_STATE, ...local, _updatedAt: localTs };
}

// ── Supabase 동기화 ──

const ADMIN_TOKEN_KEY = "kimjinsoo_admin_token_v1";
function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

type CloudShape = {
  profile: DbState["profile"];
  websites: DbState["websites"];
  socials: DbState["socials"];
  work_links: DbState["workLinks"];
  partners: DbState["partners"];
  footer: DbState["footer"];
  programs: DbState["programs"];
  lectures: DbState["lectures"];
  updatedAt: number;
};

export async function fetchFromCloud(): Promise<CloudShape | null> {
  try {
    const [stateRes, programsRes, lecturesRes] = await Promise.all([
      fetch("/api/db/state"),
      fetch("/api/db/programs"),
      fetch("/api/db/lectures"),
    ]);
    if (!stateRes.ok || !programsRes.ok || !lecturesRes.ok) return null;
    const stateJson = await stateRes.json();
    const programsJson = await programsRes.json();
    const lecturesJson = await lecturesRes.json();
    if (!stateJson.ok || !programsJson.ok || !lecturesJson.ok) return null;
    const s = stateJson.data;
    return {
      profile: s.profile, websites: s.websites, socials: s.socials,
      work_links: s.work_links, partners: s.partners, footer: s.footer,
      programs: programsJson.data, lectures: lecturesJson.data,
      updatedAt: new Date(s.updated_at).getTime(),
    };
  } catch {
    return null;
  }
}

export async function pushStateToCloud(state: DbState): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  const res = await fetch("/api/db/state", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      profile: state.profile,
      websites: state.websites,
      socials: state.socials,
      work_links: state.workLinks,
      partners: state.partners,
      footer: state.footer,
    }),
  });
  return res.ok;
}

// ── debounced 자동 동기화 ──

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function saveStateWithSync(state: DbState) {
  saveState(state);
  writeMeta({ updatedAt: Date.now() });
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushStateToCloud(state).catch(console.error);
  }, 1500);
}
```

**Step 3: 테스트 재실행**

```bash
npm run test:run -- tests/storage-merge.test.ts
```

기대: 3 passed

**Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

**Step 5: 커밋**

```bash
git add lib/storage.ts tests/storage-merge.test.ts
git commit -m "feat: 오프라인 캐시 + Supabase 동기화 레이어"
```

---

### Task 5.2: 프로그램·강의 CRUD 클라이언트 함수

**Files:**
- Create: `lib/db-client.ts`

**Step 1: 작성**

```ts
"use client";
import { Program, Lecture } from "./types";

const ADMIN_TOKEN_KEY = "kimjinsoo_admin_token_v1";
function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

// ── Programs ──

export async function createProgram(p: Program): Promise<Program | null> {
  const res = await fetch("/api/db/programs", {
    method: "POST", headers: authHeaders(), body: JSON.stringify(p),
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

export async function updateProgram(p: Program): Promise<Program | null> {
  const res = await fetch(`/api/db/programs/${p.id}`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(p),
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const res = await fetch(`/api/db/programs/${id}`, {
    method: "DELETE", headers: authHeaders(),
  });
  return res.ok;
}

// ── Lectures ──

export async function createLecture(l: Lecture): Promise<boolean> {
  const res = await fetch("/api/db/lectures", {
    method: "POST", headers: authHeaders(), body: JSON.stringify(l),
  });
  return res.ok;
}

export async function updateLecture(l: Lecture): Promise<boolean> {
  const res = await fetch(`/api/db/lectures/${l.id}`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(l),
  });
  return res.ok;
}

export async function deleteLecture(id: string): Promise<boolean> {
  const res = await fetch(`/api/db/lectures/${id}`, {
    method: "DELETE", headers: authHeaders(),
  });
  return res.ok;
}
```

**Step 2: 커밋**

```bash
git add lib/db-client.ts
git commit -m "feat: 프로그램/강의 CRUD 클라이언트 함수"
```

---

## Phase 6 — 페이지 마이그레이션

각 페이지를 차례로 새 데이터 레이어로 전환한다. 페이지가 길어 코드 전체는 생략하고 **변경 포인트**만 명시.

### Task 6.1: 메인 페이지 (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

**변경 포인트**:
1. `import { saveState }` → `import { saveStateWithSync, fetchFromCloud, mergeStates }`
2. 초기 마운트 effect 추가:
   ```ts
   useEffect(() => {
     fetchFromCloud().then((cloud) => {
       if (!cloud) return;
       const localTs = readMetaTs(); // 새 helper 필요
       const cloudTs = cloud.updatedAt;
       if (cloudTs > localTs) {
         setState((prev) => ({ ...prev, ...cloud, workLinks: cloud.work_links }));
         saveState({ ...cloud, workLinks: cloud.work_links });
       }
     });
   }, []);
   ```
3. 모든 `saveState(next)` 호출을 `saveStateWithSync(next)`로 변경

**Step 1: 변경 적용**
**Step 2: `npm run dev` 후 메인 페이지 동작 확인**
**Step 3: 다른 PC(또는 시크릿 모드)에서 데이터 동기화 확인**
**Step 4: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: 메인 페이지 Supabase 동기화 적용"
```

---

### Task 6.2: 프로그램 페이지 (`app/programs/page.tsx`)

**Files:**
- Modify: `app/programs/page.tsx`

**변경 포인트**:
1. 초기 마운트 시 `fetch('/api/db/programs')` → 결과로 `programs` 상태 채움
2. 추가/수정/삭제 시 클라이언트 상태 업데이트 + `createProgram/updateProgram/deleteProgram` 호출
3. 실패 시 토스트 또는 console.error로 알림

**Step 1: 변경 적용**
**Step 2: 새 프로그램 추가/수정/삭제 동작 확인**
**Step 3: 커밋**

```bash
git add app/programs/page.tsx
git commit -m "feat: 프로그램 페이지 Supabase API 사용"
```

---

### Task 6.3: 어드민 페이지 (`app/admin/page.tsx`)

**Files:**
- Modify: `app/admin/page.tsx`

**변경 포인트**:
- 기존 `lib/sheets.ts` 호출을 새 API로 교체
- `Programs`, `Lectures` 탭은 `/api/db/programs`, `/api/db/lectures`로
- `Main` 탭(웹사이트/소셜 등)은 `/api/db/state`
- `Vault` 탭은 별도 처리(다음 Task)

**Step 1: 변경 적용**
**Step 2: 어드민 페이지에서 모든 탭 작동 확인**
**Step 3: 커밋**

```bash
git add app/admin/page.tsx
git commit -m "refactor: 어드민 페이지 Supabase API로 전환"
```

---

### Task 6.4: Vault 페이지 — 결정 필요

**현황 확인 필요**: `app/vault/page.tsx`와 `lib/vault.ts`가 무엇을 저장하는지.

**Step 1: Vault 데이터 구조 파악**

```bash
# 파일 내용 확인
cat app/vault/page.tsx
cat lib/vault.ts
```

**Step 2: 결정 트리**
- Vault가 단순 메모/링크면 → `state` 테이블에 `vault: jsonb` 컬럼 추가
- Vault가 민감 정보(API 키, 비밀번호)면 → 별도 테이블 + 필드 암호화 고려
- Vault를 일단 보류 → 기존 localStorage 유지, Phase 후반에 별도 처리

**Step 3: 결정 후 적용**

(Phase 6.4는 Phase 5 완료 후 사용자와 재논의 권장 — 보안 영향 있음)

---

## Phase 7 — 자동 마이그레이션

기존 사용자(=본인)가 처음 새 버전을 열 때 localStorage 데이터를 Supabase에 한 번만 업로드.

### Task 7.1: 마이그레이션 함수 작성

**Files:**
- Create: `lib/migrate-to-cloud.ts`

**Step 1: 작성**

```ts
"use client";
import { loadState } from "./storage";
import { createProgram, createLecture } from "./db-client";

const MIGRATION_FLAG = "kimjinsoo_migrated_to_supabase_v1";

export async function migrateLocalToCloud(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (typeof window === "undefined")
    return { ok: false, message: "no window" };
  if (sessionStorage.getItem("kimjinsoo_admin_token_v1") == null)
    return { ok: false, message: "어드민 인증 필요" };
  if (localStorage.getItem(MIGRATION_FLAG) === "1")
    return { ok: true, message: "이미 마이그레이션 완료됨" };

  const local = loadState();

  // 1) state 업데이트
  const token = sessionStorage.getItem("kimjinsoo_admin_token_v1")!;
  const stateRes = await fetch("/api/db/state", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      profile: local.profile,
      websites: local.websites,
      socials: local.socials,
      work_links: local.workLinks,
      partners: local.partners,
      footer: local.footer,
    }),
  });
  if (!stateRes.ok) return { ok: false, message: "state 업로드 실패" };

  // 2) programs 일괄 업로드
  for (const p of local.programs) {
    await createProgram(p);
  }

  // 3) lectures 일괄 업로드
  for (const l of local.lectures) {
    await createLecture(l);
  }

  localStorage.setItem(MIGRATION_FLAG, "1");
  return {
    ok: true,
    message: `마이그레이션 완료: 프로그램 ${local.programs.length}개, 강의 ${local.lectures.length}개`,
  };
}
```

**Step 2: 어드민 페이지에 "클라우드로 이주" 버튼 추가**

`app/admin/page.tsx` 상단에 버튼 한 개 추가, 클릭 시 `migrateLocalToCloud()` 호출 후 결과 alert.

**Step 3: 실제 마이그레이션 실행 (사용자 수동)**

1. Production이 아닌 dev에서 먼저 테스트
2. localStorage 데이터 백업: `⬇ 내보내기` 버튼으로 JSON 파일 저장
3. 어드민 페이지에서 "클라우드로 이주" 클릭
4. Supabase Table Editor에서 데이터 확인

**Step 4: 커밋**

```bash
git add lib/migrate-to-cloud.ts app/admin/page.tsx
git commit -m "feat: localStorage → Supabase 일회성 마이그레이션"
```

---

## Phase 8 — GAS 인프라 정리 + 배포

### Task 8.1: GAS 의존성 제거

**Files:**
- Delete: `lib/sheets.ts`, `gas/Code.gs`
- Modify: `app/api/suggest/route.ts` (GAS_URL 사용 시), `.env.local.example`

**Step 1: GAS 사용처 검색**

```bash
grep -r "GAS_URL\|sheets" --include="*.ts" --include="*.tsx" .
```

**Step 2: 모든 사용처를 새 API로 교체했는지 확인 후 파일 삭제**

```bash
git rm lib/sheets.ts
git rm gas/Code.gs
```

**Step 3: 환경변수 정리**

`.env.local`과 `.env.local.example`에서 `NEXT_PUBLIC_GAS_URL` 줄 제거.

**Step 4: 빌드·테스트**

```bash
npx tsc --noEmit
npm run test:run
npm run build
```

**Step 5: 커밋**

```bash
git add -A
git commit -m "chore: GAS 백엔드 제거 (Supabase 전환 완료)"
```

---

### Task 8.2: Vercel 환경변수 설정

**누가**: 사용자 + Claude

**Step 1: Vercel 대시보드 — Settings → Environment Variables**

다음 3개 추가 (Production · Preview · Development 모두 체크):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`NEXT_PUBLIC_GAS_URL`은 제거.

**Step 2: 재배포**

```bash
npx vercel --prod --yes
```

**Step 3: 프로덕션 검증**

`https://kimjinsoo-db.vercel.app` 접속 → 로그인 → 데이터 표시 확인

---

## Phase 9 — 멀티 디바이스 검증 + 문서

### Task 9.1: 동기화 검증 시나리오

**Step 1: PC A에서**
1. 어드민 로그인
2. 새 강의 추가 (예: "테스트 강의 2026-05-01")
3. 새로고침 → 강의 표시 확인

**Step 2: PC B(또는 다른 브라우저)에서**
1. 어드민 로그인
2. 같은 강의가 보이는지 확인 ✓
3. 강의 제목 수정 (예: "테스트 강의 → 검증 강의")

**Step 3: PC A로 돌아가**
1. 새로고침
2. 수정 사항 반영 확인 ✓

**Step 4: 오프라인 시나리오 (선택)**
1. PC A에서 네트워크 끊고 강의 추가
2. 네트워크 복구
3. 30초 내 자동 푸시되는지 확인

---

### Task 9.2: 문서 업데이트

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Step 1: CLAUDE.md 업데이트**
- "데이터 저장: 브라우저 localStorage" → "Supabase Postgres + localStorage 오프라인 캐시"
- "주의사항"의 "localStorage 한계" 항목 제거
- "확장 아이디어"의 "Supabase 연동" 체크 표시
- 환경변수 섹션에 Supabase 3종 추가

**Step 2: README.md도 동일하게 갱신**

**Step 3: 세션 로그 추가**

`docs/session-log-2026-05-01.md`:
- 마이그레이션 배경(localStorage 한계로 멀티기기 불가)
- 선택 옵션(하이브리드 스키마 + 토큰 인증 + 오프라인 캐시)
- 마이그레이션 결과(데이터 건수, 검증 시나리오)

**Step 4: 커밋**

```bash
git add CLAUDE.md README.md docs/
git commit -m "docs: Supabase 마이그레이션 문서 갱신"
```

---

## 전체 검증 체크리스트

- [ ] Supabase 프로젝트 생성, 환경변수 3개 설정
- [ ] 4개 테이블(`state`, `programs`, `lectures`, `lecture_attachments`) 생성
- [ ] RLS: anon은 읽기만, 쓰기는 service_role만
- [ ] `/api/vault/auth`가 토큰 발급, `AdminAuth`가 sessionStorage에 저장
- [ ] 모든 쓰기 API가 `Authorization: Bearer` 헤더 검증
- [ ] `mergeStates`가 timestamp 기반으로 올바르게 머지
- [ ] 메인 페이지: 마운트 시 cloud fetch + 변경 시 자동 sync
- [ ] 프로그램 페이지: 추가/수정/삭제 모두 cloud 반영
- [ ] 어드민 페이지: 강의 CRUD 정상, 첨부 포함
- [ ] localStorage → Supabase 일회성 마이그레이션 1회 실행 완료
- [ ] PC 2대 이상에서 동일 데이터 표시 확인
- [ ] GAS 코드/환경변수 제거
- [ ] Vercel Production 배포 성공
- [ ] CLAUDE.md, README.md 갱신

---

## 위험 요소 & 회피

| 위험 | 회피 |
|---|---|
| 마이그레이션 중 데이터 유실 | Phase 7 전 `⬇ 내보내기`로 JSON 백업 필수 |
| service_role 키 노출 | `import "server-only"`로 클라이언트 번들 차단 |
| 동시 편집 충돌 | 단일 사용자 가정 + last-write-wins (state 단위 timestamp) |
| 네트워크 오류 시 데이터 유실 | localStorage 1차 캐시로 보존, 다음 push에서 재시도 |
| RLS 누락으로 외부 쓰기 가능 | RLS 활성화 + write 정책 미작성으로 service_role만 통과 |
| Vault 데이터 보안 | Phase 6.4에서 별도 결정 (암호화 또는 보류) |

---

## 다음 단계 — 마이그레이션 후 가능해지는 것들

이 마이그레이션이 끝나면 다음이 자연스럽게 열립니다:

- 강의 통계 페이지 (월별/유형별 시수·강의료 집계 — SQL `group by`)
- 강의 검색·필터(태그, 기관, 기간)
- iOS Safari, Android 어디서든 동일 데이터
- 향후 Supabase Storage로 첨부파일 실제 업로드(현재는 URL 문자열만)
- Realtime 구독으로 다른 기기 변경 즉시 반영
