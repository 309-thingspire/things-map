# Claude Code 시작 프롬프트 — things-map

---

## 프로젝트 개요

**things-map**은 커뮤니티 기반 맛집 지도 서비스입니다.
- 네이버 클라우드 Maps SDK로 지도/리스트 뷰 제공
- 외부 평점과 별개로 내부 평점(맛/가성비/서비스/분위기/청결도) 운영
- 관리자 발급 승인코드로 로그인, JWT 세션 30일 유지
- 관리자 대시보드: 매장 CRUD, 사용자 관리, 등록 요청 처리, 데이터 수집
- 카카오/네이버 공식 API로 2주 1회 매장 데이터 자동 수집
- Playwright 단건 조회: 관리자가 매장명 입력 → 지도에서 정보 추출 → 검토 후 저장

**기술 스택**
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- PostgreSQL (Neon 무료) + Prisma ORM
- JWT (자체 구현, httpOnly 쿠키)
- 네이버 클라우드 Maps SDK
- Vercel 배포 + Vercel Cron Jobs

**환경변수** (.env.local)
```
DATABASE_URL=
JWT_SECRET=
NAVER_MAPS_CLIENT_ID=
NAVER_MAPS_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
KAKAO_REST_API_KEY=
CRON_SECRET=
```

---

## 첨부 파일 구성

- `PRD_things-map_v0.4.md` — 전체 제품 요구사항
- `folder-structure.md` — 프로젝트 폴더 구조
- `schema.prisma` — Prisma DB 스키마 (그대로 사용)
- `api-design.md` — API 라우트 전체 설계

---

## 작업 지시

### Step 1. 프로젝트 초기 세팅

```bash
npx create-next-app@latest things-map \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*"

cd things-map
npx shadcn@latest init
npx shadcn@latest add button input table badge dialog sheet tabs
npm install prisma @prisma/client jose
npm install -D @types/node
npx prisma init
```

첨부된 `schema.prisma`를 `prisma/schema.prisma`에 그대로 사용하세요.

---

### Step 2. M1 — 인증 시스템 (최우선 구현)

**구현 순서:**

1. `src/lib/prisma.ts` — Prisma 싱글톤 클라이언트
2. `src/lib/auth.ts` — JWT 생성/검증 (jose 라이브러리, Edge Runtime 호환)
3. `src/middleware.ts` — 보호 라우트 처리
4. `src/app/api/auth/login/route.ts` — 승인코드 로그인
5. `src/app/api/auth/logout/route.ts` — 로그아웃
6. `src/app/api/auth/me/route.ts` — 내 정보
7. `src/app/login/page.tsx` — 로그인 UI

**인증 로직:**
```
POST /api/auth/login
  { name, approvalCode }
  → User 조회 (name + approvalCode 매칭)
  → isActive 확인
  → JWT 생성 (payload: { userId, role })
  → Set-Cookie: token=JWT; HttpOnly; Max-Age=2592000; Path=/; SameSite=Lax
  → lastLogin 업데이트
```

**미들웨어 보호 규칙:**
- `/admin/*` → 관리자(ADMIN)만 접근. 아니면 `/`로 리다이렉트
- `/request/*`, `/stores/*/review` → 로그인 필요. 아니면 `/login`으로 리다이렉트
- 그 외 → 공개

**초기 관리자 계정 시드:**
```typescript
// prisma/seed.ts
// 최초 실행 시 관리자 계정 1개 생성
// approvalCode는 콘솔에 출력
```

---

### Step 3. M2 — 지도 + 매장

**네이버 지도 설정:**
```typescript
// next.config.js에 외부 스크립트 허용 추가
// _document 대신 App Router에서는 layout.tsx의 <Script> 태그로 로드

// src/components/map/NaverMap.tsx
// - "use client" 컴포넌트
// - window.naver.maps.Map 초기화
// - 매장 목록 변경 시 마커 재렌더링
// - 마커 클릭 → InfoWindow로 요약 카드 표시
```

**네이버 지도 스크립트 URL:**
```
https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAPS_CLIENT_ID}
```

**구현할 페이지/컴포넌트:**
- `src/app/page.tsx` — 지도 뷰 + 리스트 뷰 전환 (기본: 지도)
- `src/components/map/NaverMap.tsx` — 지도 컴포넌트
- `src/components/map/StoreMarker.tsx` — 카테고리별 마커
- `src/components/store/StoreCard.tsx` — 리스트 카드
- `src/app/stores/[id]/page.tsx` — 매장 상세

**API:**
- `GET /api/stores` — 쿼리 파라미터: lat, lng, radius, category, theme, minRating, sort, page, limit
- `GET /api/stores/search` — 자동완성
- `GET /api/stores/:id` — 상세

---

### Step 4. M3 — 평점·리뷰

- `POST /api/stores/:id/reviews` — 리뷰 작성 후 InternalRating 자동 재집계
- `POST /api/reviews/:id/like` — 좋아요
- `POST /api/reviews/:id/report` — 신고

**InternalRating 재집계 로직:**
```typescript
// 리뷰 작성/삭제 시 해당 매장의 모든 ACTIVE 리뷰를 집계
// upsert로 InternalRating 업데이트
const avg = await prisma.review.aggregate({
  where: { storeId, status: 'ACTIVE' },
  _avg: { scoreTotal, scoreTaste, scorePrice, scoreService, scoreAmbiance, scoreCleanliness },
  _count: { id: true }
})
```

---

### Step 5. M4 — 관리자 대시보드

`src/app/admin/` 하위 전체 구현.

**매장 관리 테이블 (`/admin/stores`):**
- TanStack Table 또는 shadcn DataTable 사용
- 컬럼: 매장명, 카테고리, 주소, 평점, 리뷰 수, 상태, 수정일
- 인라인 편집: 카테고리, 테마 태그, 상태
- 매장 추가/수정/삭제 다이얼로그

**계정 관리 (`/admin/users`):**
- 이름 + 팀 입력 → 승인코드 생성 → 화면에 표시 (복사 버튼)
- 사용자 목록: 이름, 팀, 역할, 마지막 로그인, 활성화 여부

**등록 요청 (`/admin/requests`):**
- 상태 탭: 전체 / 대기 / 승인 / 반려
- 요청 클릭 → 상세 시트(Sheet) 열기 → 편집 후 승인/반려

**데이터 수집 (`/admin/crawl`):**
- 탭 1: API 수집 (키워드 입력 + 플랫폼 선택 → 실행)
- 탭 2: Playwright 단건 (매장명 입력 → 결과 미리보기 → 저장)
- 탭 3: 수집 임시 목록 (라벨링 후 승인/버림)
- 탭 4: 작업 이력

---

### Step 6. M5 — 데이터 수집

**카카오 Local API** (`src/lib/crawl/kakao.ts`):
```typescript
// https://dapi.kakao.com/v2/local/search/keyword.json
// Authorization: KakaoAK ${KAKAO_REST_API_KEY}
// params: query, category_group_code, x, y, radius, page, size
```

**네이버 지역검색 API** (`src/lib/crawl/naver.ts`):
```typescript
// https://openapi.naver.com/v1/search/local.json
// X-Naver-Client-Id, X-Naver-Client-Secret 헤더
// params: query, display, start, sort
```

**Playwright 단건** (`src/lib/crawl/playwright.ts`):
```typescript
// npm install playwright
// 카카오맵 검색 → 첫 번째 결과 클릭 → 텍스트 추출
// 랜덤 딜레이 적용 (2~4초)
// headless: true
// 추출 항목: 매장명, 주소, 전화번호, 영업시간, 카테고리, 메뉴
```

**Vercel Cron** (`src/app/api/cron/crawl/route.ts`):
```typescript
// vercel.json: { "crons": [{ "path": "/api/cron/crawl", "schedule": "0 2 1,15 * *" }] }
// Authorization: Bearer ${CRON_SECRET} 헤더 검증
// 사전 정의된 키워드 목록으로 카카오/네이버 API 순차 호출
```

---

## 코딩 컨벤션

- **TypeScript strict mode** 사용
- API Route는 모두 **try-catch** + 적절한 HTTP 상태코드 반환
- 인증 체크는 **미들웨어** 또는 각 route 상단에서 `verifyToken()` 호출
- Prisma 쿼리는 `src/lib/prisma.ts` 싱글톤 사용
- 클라이언트 컴포넌트는 최소화 (`"use client"` 필요한 것만)
- 에러는 `{ error: "메시지" }` 형태로 통일

**응답 형태 통일:**
```typescript
// 성공
return NextResponse.json({ data }, { status: 200 })

// 에러
return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
```

---

## 구현 우선순위

```
1순위 (M1): 프로젝트 세팅 + DB + 인증
2순위 (M2): 지도 뷰 + 매장 API + 상세 페이지
3순위 (M4): 관리자 대시보드 (매장/사용자/요청 관리)
4순위 (M3): 리뷰/평점 시스템
5순위 (M5): 크롤링 + Cron
6순위 (M6): QA + 배포
```

---

## 시작 명령

**지금 당장 해주세요:**

1. Next.js 프로젝트 생성 및 의존성 설치
2. `prisma/schema.prisma` 설정 (첨부 파일 사용)
3. `prisma/seed.ts` 작성 (초기 관리자 계정 생성)
4. `src/lib/prisma.ts`, `src/lib/auth.ts` 작성
5. `src/middleware.ts` 작성
6. 인증 API 3개 (`/api/auth/login`, `/logout`, `/me`) 작성
7. 로그인 페이지 UI 작성

**M1 완료 기준:** 승인코드로 로그인 → 쿠키 설정 → `/admin` 접근 가능 → 로그아웃 동작
