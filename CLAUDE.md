# CLAUDE.md — visit-fe

## 프로젝트 개요

방문 예약 시스템의 프론트엔드. 단일 페이지(`ReservePage.tsx`)에서 예약 접수와 예약 확인 두 기능을 제공한다.
앱 제목: **스위트홈**

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19, TypeScript 5.9 |
| 빌드 | Vite 8 (`@vitejs/plugin-react` — Oxc parser) |
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
│   ├── ReservePage.tsx   # 유일한 컴포넌트 (420줄)
│   ├── index.css         # Tailwind import + shake 애니메이션 정의
│   └── App.css           # 미사용 (레거시)
├── index.html            # 타이틀: 스위트홈
├── vite.config.ts
├── tsconfig.app.json     # strict 모드, noUnusedLocals 등
├── postcss.config.js
└── eslint.config.js
```

---

## ReservePage 구조

### FloatingInput 컴포넌트
- 포커스/값 있을 때 레이블이 위로 올라가는 플로팅 라벨
- `type="password"` → 비밀번호 표시 토글 내장
- `shakeKey` prop 바뀌면 shake 애니메이션 재실행
- `as="textarea"` 지원

### 탭 1: 예약 (`reserve`)
필드: 이름, 전화번호(XXX-XXXX-XXXX 자동 포맷), 방문일(오늘 이후), 방문 인원(1~10), 메모(선택), 비밀번호(6자+)

### 탭 2: 예약 확인 (`check`)
필드: 이름, 전화번호, 비밀번호

---

## API 연동 (미구현)

두 곳에 `// TODO: API call` 주석이 있다:
- `submitReserve()` — 예약 생성 API
- `submitCheck()` — 예약 조회 API

현재는 검증만 하고 바로 성공 화면으로 전환함.

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

- `dev` — 개발 브랜치 (현재 작업 브랜치)
- `main` / `master` — 프로덕션 (동일 커밋)
- PR base: `main`
