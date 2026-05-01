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
drop policy if exists "anyone can select state" on public.state;
create policy "anyone can select state"
  on public.state for select using (true);

drop policy if exists "anyone can select programs" on public.programs;
create policy "anyone can select programs"
  on public.programs for select using (true);

drop policy if exists "anyone can select lectures" on public.lectures;
create policy "anyone can select lectures"
  on public.lectures for select using (true);

drop policy if exists "anyone can select lecture_attachments" on public.lecture_attachments;
create policy "anyone can select lecture_attachments"
  on public.lecture_attachments for select using (true);

-- 쓰기는 RLS 우회하는 service_role만 가능 (정책 미작성 = 차단)
