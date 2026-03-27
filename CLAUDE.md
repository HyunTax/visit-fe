# CLAUDE.md — visit-fe

## 프로젝트 개요

방문 예약 시스템의 프론트엔드. 단일 페이지(`ReservePage.tsx`)에서 예약 접수와 예약 확인 두 기능을 제공한다.
앱 제목: **스위트홈**

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19, TypeScript 5.9 |
| 빌드 | Vite 8 (`@vitejs/plugin-react`) |
| 스타일링 | Tailwind CSS v4 (PostCSS 처리) |
| 상태관리 | React 내장 hooks만 사용 (외부 라이브러리 없음) |
| 라우팅 | 없음 — 탭 상태(`activeTab`)로 뷰 전환 |
| 린팅 | ESLint 9 flat config + typescript-eslint |

---

## 디렉토리 구조

```
visit-fe/
├── src/
│   ├── main.tsx          # 엔트리 포인트 — ReservePage 직접 마운트
│   ├── ReservePage.tsx   # 메인 컴포넌트 (FloatingInput, ReservationModal 포함)
│   ├── Toast.tsx         # 에러/알림 토스트 컴포넌트
│   ├── api.ts            # 백엔드 API 함수 모음
│   ├── index.css         # Tailwind import + shake 애니메이션 정의
│   └── App.css           # 미사용 (레거시)
├── index.html            # 타이틀: 스위트홈
├── vite.config.ts
├── tsconfig.app.json     # strict 모드, noUnusedLocals 등
├── postcss.config.js
└── eslint.config.js
```

> `src/assets/` — 이미지 파일 보관 (.gitignore 처리됨)

---

## ReservePage 구조

### FloatingInput 컴포넌트
- 포커스/값 있을 때 레이블이 위로 올라가는 플로팅 라벨
- `type="password"` → 비밀번호 표시 토글 내장
- `shakeKey` prop 바뀌면 shake 애니메이션 재실행
- `as="textarea"` 지원

### ReservationModal 컴포넌트
- 예약 상세 조회 팝업 (이름, 전화번호, 방문일, 방문 인원, 메모)
- 수정 모드 전환 → 방문일 / 방문 인원 / 메모 수정 가능
- 수정 성공 시 `onUpdated(editForm)` 콜백으로 부모 `detail` state 갱신 (팝업 유지한 채 화면 즉시 반영)
- 예약 취소(DELETE) 기능 포함
- 세션 만료(401) 시 `onUnauthorized` 콜백으로 토큰 초기화

### Toast 컴포넌트
- 화면 상단 중앙 고정 토스트 메시지
- 3초 후 자동 사라짐, 수동 닫기(✕) 지원

### 탭 1: 예약 (`reserve`)
필드: 이름, 전화번호(XXX-XXXX-XXXX 자동 포맷), 방문일(오늘 이후), 방문 인원(1~10), 비밀번호(6자+), 메모(선택)

### 탭 2: 예약 확인 (`check`)
필드: 이름, 전화번호, 비밀번호
→ 인증(postAuth) 후 토큰 발급 → 예약 조회(getReservation) → ReservationModal 표시

---

## API 연동 (`src/api.ts`)

백엔드 기본 URL은 `api.ts` 상단 `BASE` 상수에 정의. 환경에 따라 수정 필요.

| 함수 | 메서드 | 엔드포인트 | 설명 |
|------|--------|-----------|------|
| `postAuth` | POST | `/auth` | 인증 토큰 발급 (응답: Bearer 토큰 문자열) |
| `postReservation` | POST | `/reservation` | 예약 생성 |
| `getReservation` | GET | `/reservation/find` | 예약 조회 (query string + Bearer 토큰) |
| `putReservation` | PUT | `/reservation/:id` | 예약 수정 (Bearer 토큰) |
| `deleteReservation` | DELETE | `/reservation/:id` | 예약 취소 (Bearer 토큰) |

- 전화번호는 API 전송 시 하이픈 제거 (`replace(/-/g, "")`)
- 401 응답 → `UnauthorizedError` throw (세션 만료 처리)
- 그 외 에러 → 응답 body의 `message` 필드 추출 후 throw

---

## 개발 명령어

```bash
npm run dev      # 개발 서버 (HMR)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # 프로덕션 빌드 미리보기
```

---

## TypeScript 설정 주의사항

- `noUnusedLocals: true`, `noUnusedParameters: true` — 미사용 변수/파라미터 에러
- `strict: true` 전체 활성화
- 빌드 전 `tsc -b`로 타입 체크 필수

---

## 스타일링 규칙

- 모든 스타일은 Tailwind 유틸리티 클래스로 처리
- 커스텀 CSS는 `index.css`에만 작성 (현재 shake 애니메이션만 있음)
- CSS 모듈, styled-components 사용하지 않음

---

## 브랜치 전략

- `main` — 프로덕션 브랜치, PR base
- 기능 개발은 별도 브랜치에서 작업 후 `main`으로 PR
