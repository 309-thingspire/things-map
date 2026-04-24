@AGENTS.md

# things-map — Claude Code 가이드

## 프로젝트 개요

띵스파이어 사내 맛집·카페 지도 서비스. 회사 근처 매장을 네이버 지도 위에 표시하고, 리뷰·즐겨찾기·AI 추천(띵봇)을 제공하는 풀스택 Next.js 앱.

- **스택**: Next.js 16.2.4 (App Router, Turbopack), React 19, Prisma v5, Neon PostgreSQL, Tailwind CSS v4
- **배포**: Vercel (자동 배포, main 브랜치 push 시)
- **DB**: Neon PostgreSQL (서버리스, 연결 풀링 활성화)
- **인증**: JWT (jose), 쿠키 기반, 승인코드 로그인 방식

## 아키텍처 원칙

1. **API는 모두 Route Handler** (`src/app/api/**/route.ts`) — pages/api 사용 금지
2. **DB 접근은 서버 전용** — 클라이언트 컴포넌트에서 prisma 직접 호출 금지
3. **인증은 `getSession()`** (`src/lib/auth.ts`) — 모든 관리자 API는 `role === 'ADMIN'` 체크 필수
4. **중복 매장 방지** — 매장 생성 시 반드시 `findDuplicateStore()` 호출 (`src/lib/checkDuplicate.ts`)
5. **주소 정제** — 주소 저장 시 반드시 `sanitizeAddress()` 호출 (`src/lib/sanitizeAddress.ts`)
6. **거리 계산** — 매장 생성/수정 시 `calcOfficeDistance()` 호출 → `officeDistanceM`, `walkingMinutes` 저장

## 코딩 컨벤션

### 파일 구조
```
src/
  app/          # Next.js App Router 라우트
    (user)/     # 일반 사용자 페이지
    (auth)/     # 인증 페이지
    admin/      # 관리자 페이지
    api/        # API Route Handlers
  components/
    ui/         # shadcn 기본 UI
    store/      # 매장 관련 컴포넌트
    map/        # 네이버 지도 컴포넌트
    ai/         # AI 채팅 컴포넌트
  lib/          # 서버/공통 유틸리티
  hooks/        # 클라이언트 훅
  contexts/     # React Context
  types/        # 공유 타입 정의
```

### 네이밍
- 컴포넌트: PascalCase (`StoreCard.tsx`)
- 훅: camelCase + use 접두어 (`useStores.ts`)
- API: REST 컨벤션 (`GET /api/stores`, `POST /api/stores/[id]/favorite`)
- DB 모델: PascalCase, 컬럼은 snake_case (`@map("store_id")`)
- Tailwind: utility-first, 인라인 스타일은 동적 값(hex 색상 등)에만 허용

### API 응답 형식
```ts
// 성공
return NextResponse.json({ data: result })
return NextResponse.json({ data: result }, { status: 201 })

// 에러
return NextResponse.json({ error: '메시지' }, { status: 400 })
return NextResponse.json({ error: '메시지', duplicateId: id }, { status: 409 })
```

### 컴포넌트 패턴
- `'use client'` — 상태·이벤트 필요한 컴포넌트에만
- 서버 컴포넌트는 기본값 (지시어 없음)
- Props 타입은 인터페이스로 컴포넌트 바로 위에 정의
- 주석은 WHY가 비명확할 때만. 무엇을 하는지 설명하는 주석 금지

## 피드백 루프

```bash
# 노드 경로 설정 필요
export PATH="$HOME/.local/node/node-v22.22.2-darwin-arm64/bin:$PATH"

# TypeScript 타입 체크 (에러 0개여야 배포)
node node_modules/typescript/bin/tsc --noEmit

# 린트
node node_modules/next/dist/bin/next lint

# 빌드 검증
node node_modules/next/dist/bin/next build

# DB 마이그레이션
node node_modules/.bin/prisma migrate dev --name <설명>
node node_modules/.bin/prisma generate

# 개발 서버
node node_modules/next/dist/bin/next dev
```

## 환경 변수

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | Neon PostgreSQL |
| `JWT_SECRET` | JWT 서명 키 |
| `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` | 네이버 지도 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 지역 검색 |
| `KAKAO_REST_API_KEY` | 카카오 맵 |
| `CRON_SECRET` | Vercel Cron 인증 |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | 띵봇 AI |

## 금지 사항

- 클라이언트 컴포넌트에서 `prisma` 직접 import
- `pages/api/` 사용 (App Router Route Handler만)
- `any` 타입 (불가피 시 `unknown` + 타입 가드)
- 주소 raw 저장 (`sanitizeAddress()` 필수)
- 매장 중복 생성 (`findDuplicateStore()` 필수)
- 관리자 API 인증 누락 (`role !== 'ADMIN'` 체크 필수)
- `console.log` 잔류

## 작업 완료 조건

- [ ] `tsc --noEmit` 에러 0개
- [ ] 새 DB 모델/컬럼 추가 시 마이그레이션 적용 완료
- [ ] 매장 생성 경로: `findDuplicateStore` + `sanitizeAddress` + `calcOfficeDistance` 통과
- [ ] 관리자 기능: `role === 'ADMIN'` 체크 포함
- [ ] `architecture.md` 신규 라우트/모델 반영
- [ ] `progress.md` 완료 항목 체크
