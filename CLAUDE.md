# CLAUDE.md — visit-fe

## 프로젝트 개요

방문 예약 시스템의 프론트엔드. 고객 예약/예약확인 기능과 관리자 예약 관리 기능을 제공한다.
앱 제목: **스위트홈**

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19, TypeScript 5.9 |
| 빌드 | Vite 8 (`@vitejs/plugin-react`) |
| 스타일링 | Tailwind CSS v4 (PostCSS 처리) |
| 날짜 선택 | react-datepicker + date-fns (ko locale) |
| 상태관리 | React 내장 hooks만 사용 (외부 라이브러리 없음) |
| 라우팅 | 라우터 라이브러리 없음 — `history.pushState` + `popstate` 이벤트로 SPA 라우팅 |
| 린팅 | ESLint 9 flat config + typescript-eslint |

---

## 디렉토리 구조

```
visit-fe/
├── src/
│   ├── main.tsx                 # 엔트리 포인트 — ReservePage만 마운트
│   ├── ReservePage.tsx          # 메인 컴포넌트 (고객 예약/확인 + 관리자 overlay 조율)
│   ├── FloatingInput.tsx        # 공유 컴포넌트: FloatingInput<T>, cx() 헬퍼
│   ├── AdminLogin.tsx           # 관리자 로그인 모달
│   ├── AdminReservationList.tsx # 관리자 예약 목록/승인/거절 화면
│   ├── AdminRejectModal.tsx     # 예약 거절 사유 입력 모달
│   ├── AdminPage.tsx            # 미사용 (레거시, 삭제 가능)
│   ├── Toast.tsx                # 에러/알림 토스트 컴포넌트
│   ├── api.ts                   # 백엔드 API 함수 모음
│   ├── index.css                # Tailwind import + shake 애니메이션 정의
│   └── App.css                  # 미사용 (레거시)
├── index.html                   # 타이틀: 스위트홈
├── vite.config.ts
├── tsconfig.app.json            # strict 모드, noUnusedLocals 등
├── postcss.config.js
└── eslint.config.js
```

> `src/assets/` — 이미지 파일 보관 (`.gitignore` 처리됨, `main.jpg` 사용 중)

---

## SPA 라우팅 방식

라우터 라이브러리 없이 `history.pushState`로 URL을 직접 제어한다.

- `/` — 고객 화면 (기본)
- `/admin` — URL 직접 접근 시 관리자 로그인 팝업 표시

**관리자 진입 흐름:**
1. "관리자 로그인" 버튼 클릭 → `history.pushState({}, "", "/admin")` + `setShowAdminLogin(true)`
2. `/admin` URL 직접 접근 → `useEffect`에서 `pathname === "/admin"` 감지 → `setShowAdminLogin(true)`
3. 로그인 성공 → `adminToken` 설정, `showAdminList: true` (추가 pushState 없음)
4. 로그인 취소/닫기 → `history.pushState({}, "", "/")` + `setShowAdminLogin(false)`
5. 로그아웃 → `history.pushState({}, "", "/")` + `setShowAdminList/Token: false/null`
6. `popstate` 이벤트 리스너 → 브라우저 뒤로가기/앞으로가기 시 state 동기화

> `/admin` 은 **exact match** (`=== "/admin"`)로만 감지 — 오타 URL이 관리자로 진입되지 않도록.

---

## 컴포넌트 구조

### FloatingInput (`src/FloatingInput.tsx`)
- `cx(...classes)` 유틸리티 함수 export (classNames 결합용)
- 포커스/값 있을 때 레이블이 위로 올라가는 플로팅 라벨
- `type="password"` → 비밀번호 표시/숨김 토글 내장
- `shakeKey` prop 변경 시 shake 애니메이션 재실행
- `as="textarea"` 지원
- 테두리 색상: warm tone `border-[#ece6dc] focus:ring-[#e8d5c0]`

### DateFloatingInput (`ReservePage.tsx` 내부)
- react-datepicker 래퍼, `CustomDateTrigger`로 FloatingInput 스타일 통일
- 오늘 이후 날짜만 선택 가능 (`minDate={today}`)
- 값 형식: `YYYY-MM-DD` 문자열

### ReservationModal (`ReservePage.tsx` 내부)
- 예약 상세 조회 팝업 (이름·전화번호·방문일·인원·알러지·메모·상태)
- `status`에 따라 하단 버튼 분기:
  - `WAIT` → 예약 취소 + 예약 수정
  - `CONFIRM` → 예약 취소만
  - `REJECT` / `CANCEL` → 새 예약하기
- `REJECT` 상태일 때 `statusMemo`(거절 사유) 빨간 박스로 표시
- 수정 플로우: 방문일/인원 수정 → 알러지/메모 재입력 단계(editConfirmMode) → PUT 요청
- `onUpdated(editForm)` 콜백으로 부모 `detail` state 갱신 (팝업 유지한 채 즉시 반영)
- 401 응답 → `onUnauthorized` 콜백으로 토큰 초기화

### AdminLogin (`src/AdminLogin.tsx`)
- `onClose?: () => void` — 있으면 dim 배경 + ✕ 버튼(팝업), 없으면 솔리드 배경(전체화면)
- 현재는 항상 `onClose` 전달 → 팝업 형태로 표시
- Enter 키 제출 지원

### AdminReservationList (`src/AdminReservationList.tsx`)
- `fixed inset-0 z-40 overflow-auto` div에 감싸져 고객 화면 위에 overlay
- 카드 레이아웃: `min-h-screen bg-slate-100 flex items-start justify-center` → `max-w-md` 카드
- 필터 탭: 전체 / 대기 / 승인 / 거절 / 취소 (각 탭에 건수 뱃지)
- WAIT 카드: 거절(`bg-red-500`) + 승인(`bg-green-600`) 버튼 flex-1 동일 너비
- REJECT 카드: `statusMemo` 빨간 박스 표시
- 상단 헤더: "메인으로" pill 버튼 (← 아이콘 포함)
- 목록 스크롤: `overflow-auto max-h-[70vh]`

### AdminRejectModal (`src/AdminRejectModal.tsx`)
- 중앙 다이얼로그: `fixed inset-0 z-50 flex items-center justify-center`
- 프리셋 태그: "해당 날짜 마감", "기타"
- 취소 / 거절 확정 버튼 flex-1 동일 너비

### Toast (`src/Toast.tsx`)
- 화면 상단 중앙 고정
- 3초 후 자동 사라짐, 수동 닫기(✕) 지원

---

## ReservePage 관리자 state

```ts
const [showAdminLogin, setShowAdminLogin] = useState(false);
const [adminToken, setAdminToken]         = useState<string | null>(null);
const [showAdminList, setShowAdminList]   = useState(false);
```

---

## API 연동 (`src/api.ts`)

BASE URL: `http://14.6.25.24:8080/v1/visit` (`BASE` 상수)

### 고객 API

| 함수 | 메서드 | 엔드포인트 | 설명 |
|------|--------|-----------|------|
| `postAuth` | POST | `/auth` | 인증 토큰 발급 (응답: 토큰 문자열) |
| `postReservation` | POST | `/reservation` | 예약 생성 |
| `getReservation` | GET | `/reservation/find` | 예약 조회 (query string + Bearer) |
| `putReservation` | PUT | `/reservation/:id` | 예약 수정 (Bearer) |
| `deleteReservation` | DELETE | `/reservation/:id` | 예약 취소 (Bearer) |

### 관리자 API

| 함수 | 메서드 | 엔드포인트 | 설명 |
|------|--------|-----------|------|
| `adminLogin` | POST | `/auth/admin` | 관리자 로그인 (body: `{password}`) |
| `getAdminReservations` | GET | `/reservation/all` | 전체 예약 목록 (Bearer) |
| `approveReservation` | POST | `/reservation/:id/confirm` | 예약 승인 (Bearer) |
| `rejectReservation` | POST | `/reservation/:id/reject` | 예약 거절 (body: `{statusMemo}`, Bearer) |

### 타입

```ts
type ReservationStatus = "WAIT" | "CONFIRM" | "REJECT" | "CANCEL";

interface ReservationDetail {
  id: number; name: string; phoneNum: string; visitDate: string;
  visitorCount: number; hasAllergy: boolean; memo: string;
  status: ReservationStatus; statusMemo: string;
}

interface AdminReservation {  // ReservationDetail과 동일 구조
  id: number; name: string; phoneNum: string; visitDate: string;
  visitorCount: number; hasAllergy: boolean; memo: string;
  status: ReservationStatus; statusMemo: string;
}
```

- 전화번호는 API 전송 시 하이픈 제거 (`replace(/-/g, "")`)
- 401 응답 → `UnauthorizedError` throw (세션 만료 처리)
- 그 외 에러 → 응답 body의 `message` 필드 추출 후 throw

---

## 디자인 토큰

| 용도 | 값 |
|------|-----|
| 고객 accent (primary) | `#c28a5a` |
| 고객 accent (hover) | `#9c6838` |
| 고객 CTA 그림자 | `shadow-[0_6px_14px_-6px_rgba(194,138,90,0.6)]` |
| 고객 탭 컨테이너 | `bg-white border border-[#f0e8dc] rounded-xl` |
| FloatingInput 테두리 | `border-[#ece6dc] focus:ring-[#e8d5c0]` |
| 관리자 accent | `bg-slate-700` / `bg-slate-800` |
| 관리자 WAIT 뱃지 | `#eef2f6` / `#64748b` |
| 관리자 CONFIRM 뱃지 | `#e6f4ea` / `#16a34a` |
| 관리자 REJECT 뱃지 | `#fdecec` / `#ef4444` |
| 관리자 CANCEL 뱃지 | `#f1f5f9` / `#94a3b8` |

---

## 고객 탭 구조

### 탭 1: 예약 (`reserve`)
필드: 이름, 전화번호(XXX-XXXX-XXXX 자동 포맷), 방문 날짜(달력 picker), 방문 인원(1~10), 비밀번호(6자+)
→ 제출 시 알러지/메모 pre-submit 단계(별도 팝업) → `postReservation`

### 탭 2: 예약 확인 (`check`)
필드: 이름, 전화번호, 비밀번호
→ `postAuth` → `getReservation` → `ReservationModal` 표시

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
- 커스텀 CSS는 `index.css`에만 작성 (현재 shake 애니메이션 + react-datepicker 커스텀)
- CSS 모듈, styled-components 사용하지 않음
- `cx()` 유틸리티는 `FloatingInput.tsx`에서 import

---

## 브랜치 전략

- `main` — 프로덕션 브랜치, PR base
- 기능 개발은 별도 브랜치에서 작업 후 `main`으로 PR
