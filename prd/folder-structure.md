# things-map 폴더 구조

```
things-map/
├── .env.local                          # 환경변수 (로컬)
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json                         # Cron Job 설정
├── prisma/
│   └── schema.prisma                   # DB 스키마
│
├── public/
│   └── icons/                          # 카테고리별 지도 마커 아이콘
│
└── src/
    ├── app/                            # Next.js App Router
    │   ├── layout.tsx                  # 루트 레이아웃
    │   ├── page.tsx                    # 메인 (지도 뷰)
    │   │
    │   ├── stores/
    │   │   └── [id]/
    │   │       └── page.tsx            # 매장 상세 페이지
    │   │
    │   ├── login/
    │   │   └── page.tsx                # 로그인 (승인코드 입력)
    │   │
    │   ├── request/
    │   │   └── page.tsx                # 매장 등록 요청 (사용자)
    │   │
    │   ├── admin/                      # 관리자 전용 (미들웨어로 보호)
    │   │   ├── layout.tsx              # 관리자 레이아웃 (사이드바)
    │   │   ├── page.tsx                # 관리자 대시보드 홈
    │   │   ├── stores/
    │   │   │   └── page.tsx            # 매장 관리 테이블
    │   │   ├── requests/
    │   │   │   └── page.tsx            # 등록 요청 관리
    │   │   ├── users/
    │   │   │   └── page.tsx            # 계정 관리 + 승인코드 발급
    │   │   ├── reviews/
    │   │   │   └── page.tsx            # 리뷰 신고 관리
    │   │   └── crawl/
    │   │       └── page.tsx            # 데이터 수집 관리
    │   │
    │   └── api/                        # API Routes
    │       ├── auth/
    │       │   ├── login/route.ts      # POST: 승인코드로 로그인
    │       │   ├── logout/route.ts     # POST: 로그아웃
    │       │   └── me/route.ts         # GET: 내 정보
    │       │
    │       ├── stores/
    │       │   ├── route.ts            # GET: 목록, POST: 생성 (admin)
    │       │   ├── [id]/
    │       │   │   ├── route.ts        # GET: 상세, PUT: 수정, DELETE: 삭제
    │       │   │   └── reviews/
    │       │   │       └── route.ts    # GET: 리뷰 목록, POST: 리뷰 작성
    │       │   └── search/
    │       │       └── route.ts        # GET: 검색 + 자동완성
    │       │
    │       ├── reviews/
    │       │   └── [id]/
    │       │       ├── like/route.ts   # POST: 좋아요
    │       │       └── report/route.ts # POST: 신고
    │       │
    │       ├── requests/               # 매장 등록 요청
    │       │   ├── route.ts            # GET: 목록 (admin), POST: 요청 생성
    │       │   └── [id]/
    │       │       └── route.ts        # PUT: 승인/반려 (admin)
    │       │
    │       ├── users/                  # 계정 관리 (admin)
    │       │   ├── route.ts            # GET: 목록, POST: 승인코드 발급
    │       │   └── [id]/
    │       │       └── route.ts        # PUT: 활성화/비활성화
    │       │
    │       ├── crawl/
    │       │   ├── api/route.ts        # POST: 공식 API 수집 실행
    │       │   ├── playwright/route.ts # POST: 단건 Playwright 조회
    │       │   ├── staging/
    │       │   │   ├── route.ts        # GET: 임시 저장 목록
    │       │   │   └── [id]/
    │       │   │       └── route.ts    # POST: 승인→DB저장, DELETE: 버림
    │       │   └── jobs/route.ts       # GET: 수집 작업 이력
    │       │
    │       └── cron/
    │           └── crawl/route.ts      # Vercel Cron (2주 1회 자동 실행)
    │
    ├── components/
    │   ├── map/
    │   │   ├── NaverMap.tsx            # 네이버 지도 컴포넌트
    │   │   ├── StoreMarker.tsx         # 매장 마커
    │   │   └── StorePopup.tsx          # 마커 클릭 팝업 카드
    │   │
    │   ├── store/
    │   │   ├── StoreCard.tsx           # 리스트 뷰 카드
    │   │   ├── StoreDetail.tsx         # 상세 페이지
    │   │   ├── RatingDisplay.tsx       # 평점 표시
    │   │   └── ReviewForm.tsx          # 리뷰 작성 폼
    │   │
    │   ├── admin/
    │   │   ├── StoreTable.tsx          # 매장 관리 데이터 테이블
    │   │   ├── RequestTable.tsx        # 요청 관리 테이블
    │   │   ├── UserTable.tsx           # 사용자 관리 테이블
    │   │   ├── CrawlPanel.tsx          # 데이터 수집 패널
    │   │   └── StagingTable.tsx        # 수집 결과 미리보기 테이블
    │   │
    │   └── ui/                         # shadcn/ui 컴포넌트
    │
    ├── lib/
    │   ├── prisma.ts                   # Prisma 클라이언트 싱글톤
    │   ├── auth.ts                     # JWT 생성/검증 유틸
    │   ├── crawl/
    │   │   ├── kakao.ts                # 카카오 Local API
    │   │   ├── naver.ts                # 네이버 지역검색 API
    │   │   └── playwright.ts           # Playwright 단건 조회
    │   └── utils.ts
    │
    ├── hooks/
    │   ├── useStores.ts                # 매장 목록 fetch
    │   ├── useMap.ts                   # 지도 상태 관리
    │   └── useAuth.ts                  # 로그인 상태
    │
    ├── types/
    │   └── index.ts                    # 공통 타입 정의
    │
    └── middleware.ts                   # 인증/관리자 라우트 보호
```
