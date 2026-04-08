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
- 💾 **자동저장** — localStorage에 즉시 반영
- ⬇⬆ **JSON Export/Import** — 백업 및 기기 이전

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
- **Storage**: 브라우저 localStorage
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

## 💾 데이터 백업

**중요**: 데이터는 브라우저 localStorage에 저장됩니다 — 기기/브라우저별로 독립적이므로 주기적 백업 권장.

1. 메인 페이지 우측 상단 **`⬇ 내보내기`** 클릭 → JSON 파일 다운로드
2. 다른 기기에서 **`⬆ 불러오기`** 로 복원

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
├── lib/
│   ├── types.ts           # 타입 정의
│   └── storage.ts         # localStorage 관리
└── tailwind.config.ts     # 커스텀 컬러 토큰
```

## 📜 라이선스
개인 프로젝트 — AICLab 김진수
