# Architecture — things-map

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 16.2.4 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, lucide-react |
| ORM | Prisma v5 |
| DB | Neon PostgreSQL (서버리스 풀링) |
| 인증 | JWT (jose), HttpOnly 쿠키 |
| 지도 | 네이버 Maps JavaScript API v3 |
| AI | Ollama (qwen3.5:9b) — ngrok 터널링 |
| 배포 | Vercel (자동 배포) |

## 디렉토리 구조

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          # 승인코드 로그인
│   ├── (user)/
│   │   ├── layout.tsx              # 헤더 + NavContent + AiChatModal
│   │   ├── page.tsx                # 메인 지도/리스트 뷰
│   │   ├── stores/[id]/page.tsx    # 매장 상세
│   │   └── request/page.tsx        # 매장 등록 요청
│   ├── admin/
│   │   ├── layout.tsx              # 사이드바 레이아웃
│   │   ├── page.tsx                # 대시보드 (통계)
│   │   ├── stores/page.tsx         # 매장 CRUD
│   │   ├── users/page.tsx          # 사용자 관리
│   │   ├── requests/page.tsx       # 등록 요청 승인/거절
│   │   ├── reviews/page.tsx        # 리뷰 관리
│   │   ├── crawl/page.tsx          # 크롤링 관리
│   │   └── categories/page.tsx     # 카테고리 관리
│   └── api/
│       ├── auth/                   # login, logout, me
│       ├── stores/                 # CRUD, favorite, view, search, csv
│       ├── reviews/                # CRUD, like, report
│       ├── requests/               # 등록 요청
│       ├── categories/             # 카테고리 CRUD
│       ├── users/                  # 사용자 관리
│       ├── user/favorites/         # 내 즐겨찾기
│       ├── admin/stats/            # 대시보드 통계
│       ├── crawl/                  # api, playwright, staging, jobs
│       ├── cron/crawl/             # 정기 크롤링
│       ├── track/visit/            # 방문 추적
│       └── ai/chat/                # 띵봇 AI (Ollama 프록시)
├── components/
│   ├── ui/                         # button, card, dialog, badge 등 (shadcn)
│   ├── store/                      # StoreCard, StoreSlideOver, ReviewForm 등
│   ├── map/NaverMap.tsx            # 네이버 지도 + 마커 + Polyline
│   └── ai/AiChatModal.tsx          # 띵봇 채팅 모달
├── lib/
│   ├── auth.ts                     # JWT 서명/검증, getSession()
│   ├── prisma.ts                   # Prisma 싱글톤
│   ├── office.ts                   # 회사 좌표, calcOfficeDistance()
│   ├── markerIcons.ts              # lucide → SVG HTML 변환
│   ├── sanitizeAddress.ts          # 주소 정제 (층/건물명 제거)
│   ├── checkDuplicate.ts           # findDuplicateStore()
│   └── crawl/kakao|naver|playwright.ts
├── hooks/
│   ├── useAuth.ts                  # 로그인 상태
│   ├── useStores.ts                # 매장 목록 fetch
│   └── useMap.ts                   # 지도 중심/줌/반경
├── contexts/
│   └── ViewModeContext.tsx         # map | list 전환
└── types/index.ts                  # 공유 타입 (StoreListItem, StoreDetail 등)
```

## 데이터 모델

```
User ──────┬──── Review (storeId)
           ├──── StoreRequest
           ├──── UserFavorite (storeId)
           ├──── UserLogin (DAU/MAU)
           └──── StoreView (storeId, source: direct|chat)

Store ─────┬──── Category (categoryId)
           ├──── Menu[]
           ├──── InternalRating (1:1)
           ├──── Review[]
           ├──── UserFavorite[]
           └──── StoreView[]

CrawlJob ──┴──── StagingStore (crawlJobId?)

PageVisit (sessionId, userId?) — 비로그인 포함 방문 추적
```

## 데이터 흐름

### 매장 조회 (지도 뷰)
```
page.tsx
  └─ useStores() → GET /api/stores?categories=&sort=&radius=
       └─ prisma.store.findMany (status: ACTIVE)
            └─ 거리 계산 (Haversine) → 정렬 → 응답
                 └─ NaverMap.tsx → 마커 렌더링
```

### 매장 생성 흐름 (관리자)
```
POST /api/stores
  ├─ getSession() → role 체크
  ├─ sanitizeAddress(address)
  ├─ findDuplicateStore(name) → 409 if 중복
  ├─ calcOfficeDistance(lat, lng)
  └─ prisma.store.create()
```

### 매장 등록 요청 승인 흐름
```
PUT /api/requests/[id] { status: 'APPROVED' }
  ├─ searchNaver(name) → 좌표/정보 자동 수집
  ├─ findDuplicateStore() → 409 if 중복
  ├─ calcOfficeDistance()
  └─ prisma.store.create()
```

### 띵봇 AI 흐름
```
AiChatModal → POST /api/ai/chat { messages }
  ├─ getSession() → 401 if 비로그인
  ├─ buildStoreContext() → prisma.store.findMany (5분 캐시)
  ├─ Ollama POST /api/chat (OLLAMA_BASE_URL via ngrok)
  └─ NDJSON stream → ReadableStream → 클라이언트 스트리밍
       └─ 완료 시: [STORE:ID] 파싱 → 카드 렌더링
            └─ 카드 클릭: POST /api/stores/[id]/view { source: 'chat' }
                       + CustomEvent('ddingbot:selectStore') → 지도 마커 선택
```

### 인증 흐름
```
POST /api/auth/login { name, approvalCode }
  └─ prisma.user.findFirst({ approvalCode })
       └─ JWT 서명 → HttpOnly 쿠키 (30일)
            └─ UserLogin 기록 (DAU/MAU 추적)
```

## 주요 상수

| 상수 | 값 | 위치 |
|------|-----|------|
| 회사 위치 | 서울 용산구 한강대로96길 11 (37.5469, 126.9741) | `src/lib/office.ts` |
| 도보 속도 | 67m/min | `src/lib/office.ts` |
| AI 모델 | qwen3.5:9b | `.env.local` |
| 기본 반경 | null (전체) | `src/app/api/stores/route.ts` |
| 맛집 기준 | favoriteCount >= 5 | `src/app/(user)/page.tsx` |
