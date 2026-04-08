# kimjinsoo_DB — 개인 브랜딩 대시보드

## 프로젝트 개요
- **목적**: 김진수(AICLab 대표)의 브랜딩 · 링크 · 프로그램 아카이브를 한 곳에서 관리하는 개인 대시보드
- **사용자**: 김진수 본인 (단일 사용자)
- **버전**: v1.0 (2026-04-08 런칭)

## 배포·레포
- **프로덕션**: https://kimjinsoo-db.vercel.app
- **GitHub**: https://github.com/kjs369369/kimjinsoo_DB
- **기본 브랜치**: `master`
- **현재 태그**: `v1.0`

## 기술 스택
- **프레임워크**: Next.js 14 (App Router) + TypeScript
- **스타일**: Tailwind CSS 3.4 + CSS 변수 기반 테마 시스템
- **데이터 저장**: 브라우저 `localStorage` (키: `kimjinsoo_db_v1`)
- **폰트**: Pretendard (시스템 폴백)
- **배포**: Vercel (CLI 직배포 — GitHub Integration 미연결 상태)
- **패키지 매니저**: npm

## 파일 구조
```
kimjinsoo_DB/
├── app/
│   ├── layout.tsx          ← 공통 레이아웃 + 테마 초기화 스크립트
│   ├── page.tsx            ← 메인: 브랜딩 & 링크 허브
│   ├── programs/page.tsx   ← 서브: 프로그램 아카이브
│   ├── globals.css         ← CSS 변수 + Tailwind 컴포넌트 클래스
│   ├── icon.png            ← 파비콘 (AICLab 로고)
│   └── apple-icon.png      ← iOS 홈화면 아이콘
├── components/
│   └── ThemeToggle.tsx     ← 다크/라이트 토글 (localStorage 연동)
├── lib/
│   ├── types.ts            ← AppState, Program, Website 등 타입
│   └── storage.ts          ← loadState, saveState, 기본값 관리
├── tailwind.config.ts      ← 커스텀 컬러 (bg, surface, primary, accent…)
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## 컬러 팔레트 (로열블루 테마)

### 다크 모드 (기본값)
- `--bg`: #000000
- `--surface`: #111111
- `--surface-2`: #1A1A1A
- `--primary`: #0048BA (로열블루)
- `--accent`: #307BFF (밝은 시안블루)
- `--fg`: #FFFFFF
- `--muted`: #AAAAAA
- `--danger`: #FF0000

### 라이트 모드
- `--bg`: #FFFFFF
- `--surface`: #F5F5F5
- `--surface-2`: #EBEBEB
- `--primary`: #0048BA (동일)
- `--accent`: #002072 (어두운 네이비)
- `--fg`: #000000
- `--muted`: #555555
- `--danger`: #FF0000

## 주요 기능

### 메인 페이지 (`/`)
- **프로필**: 이름, 한 줄 소개, 아바타
- **WEBSITES**: 홈페이지 링크 (AICLab, 블로그, 포트폴리오 등)
- **SOCIALS**: SNS 링크 (YouTube, Instagram, LinkedIn, GitHub 등)
- **FOOTER INFO**: 전화, 이메일, 사업자번호, 주소 (복사 버튼)
- **편집 모드 토글**: 우측 상단 `✎ 편집 모드` → 모든 항목 추가/수정/삭제
- **JSON 내보내기/불러오기**: `⬇ 내보내기` `⬆ 불러오기` 백업·복원

### 서브 페이지 (`/programs`)
- **카테고리 7종**: 전체 / 브랜딩 / 랜딩 / 강의용 / 업무생산성 / AI콘텐츠 / 강의관리
- **검색**: 이름·태그 실시간 필터
- **카드 그리드**: 썸네일 + 제목 + 설명 + 태그 + 상태 뱃지
- **상세 모달**: URL·GitHub·제작일·메모 전체 보기
- **추가 폼**: `+ 새 프로그램` — 이름, 카테고리, 설명, URL, 썸네일, 태그, 제작일, 상태(공개/비공개), GitHub, 메모

### 공통
- **다크/라이트 토글**: 우측 상단, localStorage에 `kjs_theme` 키로 저장
- **기본 테마**: 다크
- **데이터 자동저장**: 모든 변경사항이 즉시 localStorage에 반영

## 개발 명령어
```bash
# 개발 서버 (포트 3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드된 결과물 로컬 실행
npm run start

# 타입 체크
npx tsc --noEmit
```

## 배포 워크플로우
```bash
# 1) 로컬에서 수정·테스트
npm run dev

# 2) 커밋
git add -A
git commit -m "feat: 기능 설명"

# 3) GitHub 푸시
git push origin master

# 4) Vercel 프로덕션 재배포
npx vercel --prod --yes
```

## 작업 규칙
- **언어**: 한국어로 대화
- **커밋 메시지**: 한국어, `feat:` `fix:` `docs:` `style:` `refactor:` 접두사 사용
- **Co-Authored-By**: Claude 커밋 시 포함
- **Push 규칙**: 사용자가 명시적으로 요청할 때만 push
- **파일 수정 우선**: 새 파일 생성보다 기존 파일 수정 선호
- **컬러 수정**: `app/globals.css`의 CSS 변수만 건드리면 전체 테마 바뀜 — Tailwind 클래스 직접 수정 금지
- **데이터 모델 변경**: `lib/types.ts`와 `lib/storage.ts`의 `defaultState` 동시 업데이트 필수
- **페이지 추가**: `app/<name>/page.tsx` 생성 + `app/layout.tsx`의 네비게이션에 링크 추가

## 주의사항 ⚠️
- **localStorage 한계**: 기기·브라우저별 독립 저장 → 멀티기기 동기화 안 됨. 필요 시 Supabase 마이그레이션 고려
- **파비콘 캐시**: 변경 후 브라우저 강력 새로고침(Ctrl+Shift+R) 필요
- **Vercel 배포**: CLI 직배포 중 → GitHub Integration 연결하면 push만으로 자동 배포 가능
- **데이터 백업**: 중요한 링크·프로그램 쌓이면 주기적으로 JSON 내보내기 권장

## 다음 확장 아이디어
- [ ] Supabase 연동 → 멀티기기 동기화
- [ ] Google OAuth 로그인 (본인 인증 후 편집 모드 허용)
- [ ] 프로그램 카드 드래그앤드롭 정렬
- [ ] 통계 대시보드 (프로그램 수, 카테고리별 분포)
- [ ] OG 이미지 자동 생성 (Next.js `opengraph-image.tsx`)
- [ ] PWA 설정 (오프라인 지원)
- [ ] 태그 자동완성·관리
