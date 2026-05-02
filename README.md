# kimjinsoo_DB

> 김진수(AICLab 대표) 개인 브랜딩 · 링크 · 프로그램 아카이브 대시보드

[![Version](https://img.shields.io/badge/version-v1.0-0048BA)](https://github.com/kjs369369/kimjinsoo_DB/releases)
[![Deploy](https://img.shields.io/badge/vercel-live-307BFF)](https://kimjinsoo-db.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000)](https://nextjs.org)

## 🌐 링크
- **프로덕션**: https://kimjinsoo-db.vercel.app
- **레포지토리**: https://github.com/kjs369369/kimjinsoo_DB

## ✨ 기능

### 메인 페이지 `/` — 브랜딩 & 링크 허브
- 프로필 (이름, 소개, 아바타)
- WEBSITES — 홈페이지 링크 관리
- SOCIALS — SNS 링크 (YouTube, Instagram, LinkedIn, GitHub 등)
- FOOTER INFO — 연락처, 이메일, 사업자번호, 주소 (원클릭 복사)

### 서브 페이지 `/programs` — 프로그램 아카이브
- 제작한 웹페이지/프로그램 누적 기록
- **카테고리 7종**: 브랜딩 · 랜딩 · 강의용 · 업무생산성 · AI콘텐츠 · 강의관리 · 기타
- 카드 그리드 + 상세 모달
- 이름/태그 실시간 검색
- 썸네일, 태그, 제작일, 상태(공개/비공개), GitHub 링크, 메모 관리

### 공통
- 🌙 **다크/☀️ 라이트 테마 토글** (기본: 다크)
- ✎ **GUI 편집 모드** — 버튼 하나로 추가/수정/삭제
- 💾 **자동저장** — localStorage 1차 캐시 + Supabase debounced sync (멀티기기 동기화)
- ⬇⬆ **JSON Export/Import** — 추가 백업용

## 🎨 컬러 팔레트 (로열블루)

| 토큰 | 다크 | 라이트 |
|---|---|---|
| `bg` | `#000000` | `#FFFFFF` |
| `surface` | `#111111` | `#F5F5F5` |
| `primary` | `#0048BA` | `#0048BA` |
| `accent` | `#307BFF` | `#002072` |
| `fg` | `#FFFFFF` | `#000000` |
| `muted` | `#AAAAAA` | `#555555` |
| `danger` | `#FF0000` | `#FF0000` |

## 🛠 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4 + CSS 변수
- **Storage**: Supabase Postgres + 브라우저 localStorage 1차 캐시
- **Auth**: HMAC-SHA256 단기 토큰 (`VAULT_PASSWORD` 기반, 24h TTL)
- **Deploy**: Vercel

## 🚀 실행

```bash
# 의존성 설치
npm install

# 개발 서버 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build
npm run start
```

## 📦 배포

### 방법 1: Vercel CLI (현재 사용 중)
```bash
npx vercel --prod --yes
```

### 방법 2: GitHub Integration
Vercel 대시보드에서 `kjs369369/kimjinsoo_DB` 레포를 Import 하면 `master` 푸시마다 자동 배포됩니다.

## 💾 데이터 저장 & 백업

**저장 흐름** (2026-05-02 마이그레이션 완료):
- 변경사항은 localStorage에 즉시 반영 → debounced로 Supabase에 동기화
- 어디 기기에서 접속하든 같은 데이터를 봄

**추가 백업** (선택):
1. 메인 페이지 우측 상단 **`⬇ 내보내기`** 클릭 → JSON 파일 다운로드
2. 다른 기기에서 **`⬆ 불러오기`** 로 복원

## 🔐 환경변수 (Vercel)

| 변수 | 용도 |
|---|---|
| `VAULT_PASSWORD` | `/vault` 페이지 비밀번호 + 어드민 토큰 HMAC 시크릿 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 read-only 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 쓰기 키 (절대 클라이언트 노출 금지) |
| `ANTHROPIC_API_KEY` | 프로그램 설명/태그 자동 제안 |

## 📁 프로젝트 구조

```
kimjinsoo_DB/
├── app/
│   ├── layout.tsx         # 공통 레이아웃 + 테마 초기화
│   ├── page.tsx           # 메인 (브랜딩 허브)
│   ├── programs/page.tsx  # 서브 (프로그램 아카이브)
│   ├── globals.css        # CSS 변수 + 컴포넌트 클래스
│   └── icon.png           # 파비콘 (AICLab 로고)
├── components/
│   └── ThemeToggle.tsx    # 다크/라이트 토글
├── app/api/db/             # Supabase CRUD API (state/programs/lectures)
├── components/
│   └── ThemeToggle.tsx    # 다크/라이트 토글
├── lib/
│   ├── types.ts           # 타입 정의
│   ├── storage.ts         # localStorage 캐시 + Supabase sync
│   ├── supabase-{browser,server}.ts  # Supabase 클라이언트
│   ├── db-client.ts       # /api/db/* 래퍼
│   ├── db-mappers.ts      # snake_case ↔ camelCase
│   ├── admin-token.ts     # HMAC 토큰
│   └── migrate-to-cloud.ts  # localStorage → Supabase 일회성 이주
├── supabase/migrations/    # 0001_initial.sql (4 tables + RLS)
└── tailwind.config.ts     # 커스텀 컬러 토큰
```

## 📜 라이선스
개인 프로젝트 — AICLab 김진수
