# Admin Page + Google Sheets Integration Design

## Overview
kimjinsoo_DB 대시보드에 숨겨진 관리자 페이지를 추가하고, 데이터 저장소를 localStorage에서 Google Sheets(Apps Script)로 전환한다.

## 1. Entry Mechanism
- 헤더 `KJS_DB` 로고 3번 클릭 → 비밀번호 입력 모달
- 기존 `VAULT_PASSWORD` 환경변수 + `/api/vault/auth` 재사용
- 인증 성공 → `/admin` 이동, `sessionStorage`에 인증 상태 저장

## 2. Data Architecture — Google Sheets as Main DB
- Google Sheets 1파일, 시트 4개: `Main`, `Programs`, `Lectures`, `Vault`
- Apps Script 웹앱으로 REST API 제공
- 환경변수: `NEXT_PUBLIC_GAS_URL` (Apps Script 배포 URL)
- localStorage는 오프라인 캐시/폴백으로만 유지

### Apps Script API
| Method | Params | Action |
|--------|--------|--------|
| GET | `?sheet=Programs` | 시트 전체 데이터 조회 |
| POST | `?sheet=Programs` + body | 새 행 추가 |
| PUT | `?sheet=Programs&id=xxx` + body | 행 수정 |
| DELETE | `?sheet=Programs&id=xxx` | 행 삭제 |

### Sheet Schemas
**Main sheet**: id, section(websites/socials/workLinks/partners/footer), label, url, icon, platform, note, createdAt
**Programs sheet**: id, name, category, status, description, url, github, thumbnail, tags(JSON), createdAt, note
**Lectures sheet**: id, title, organization, curriculum, dateStart, dateEnd, type, hours, status, fee, contactName, contactEmail, contactPhone, tags(JSON), description, attachments(JSON)
**Vault sheet**: id, section, title, subtitle, year, image, url, note, docs(JSON), kyobo1, kyobo2, yes24, aladin, projectPath, github

## 3. Admin Page UI (Dashboard)
- 상단: 4개 요약 카드 (건수 + 최근 수정일)
- 하단: 탭으로 섹션 전환 → 상세 리스트 테이블
- 각 테이블: 검색, CRUD 버튼
- 기존 디자인 톤 유지 (다크/라이트 테마)

## 4. File Changes
### New Files
- `app/admin/page.tsx` — 관리자 대시보드
- `lib/sheets.ts` — Google Sheets API 클라이언트
- `components/AdminAuth.tsx` — 로고 3클릭 + 비밀번호 모달
- `gas/Code.gs` — Apps Script 코드 (참고용)

### Modified Files
- `app/layout.tsx` — AdminAuth 컴포넌트 추가 (로고에 클릭 핸들러)
- `lib/storage.ts` — Sheets 우선, localStorage 폴백으로 리팩토링
- `app/page.tsx` — sheets.ts에서 데이터 로드
- `app/programs/page.tsx` — sheets.ts에서 데이터 로드
- `app/lectures/page.tsx` — sheets.ts에서 데이터 로드
- `app/vault/page.tsx` — sheets.ts에서 데이터 로드

## 5. Environment Variables
- `NEXT_PUBLIC_GAS_URL` — Apps Script 웹앱 URL (신규)
- `VAULT_PASSWORD` — 기존 유지
- `ANTHROPIC_API_KEY` — 기존 유지
