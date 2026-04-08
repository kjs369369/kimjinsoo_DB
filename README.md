# kimjinsoo_DB

김진수 개인 브랜딩 · 링크 · 프로그램 아카이브 대시보드

## 기능
- **메인 (`/`)**: 프로필, 홈페이지 링크, SNS, 푸터 정보 (연락처/이메일/사업자/주소) 관리
- **서브 (`/programs`)**: 제작한 웹페이지/프로그램 누적 기록
  - 카테고리: 브랜딩 · 랜딩 · 강의용 · 업무생산성 · AI콘텐츠 · 강의관리 · 기타
  - 검색, 필터, 상세 모달
- **편집 모드**: GUI에서 바로 추가/수정/삭제
- **JSON Export/Import**: 백업 및 기기 이전
- **저장**: 브라우저 localStorage

## 기술 스택
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## 실행
```bash
npm install
npm run dev
# http://localhost:3000
```

## 배포
Vercel에서 GitHub 리포(`kimjinsoo_DB`)를 연결하면 자동 배포됩니다.

## 데이터 백업
메인 페이지 상단 `⬇ 내보내기` 로 JSON 다운로드 → 다른 기기에서 `⬆ 불러오기`로 복원.
