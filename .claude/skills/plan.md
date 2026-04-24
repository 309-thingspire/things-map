# Skill: Plan

## 언제 사용하나

구현 전 작업 범위와 접근 방법을 결정해야 할 때.

## 절차

### 1. 영향 범위 파악
- 수정이 필요한 파일 목록 작성
- 새로 생성할 파일 목록 작성
- DB 스키마 변경 여부 확인

### 2. 의존성 확인
- 기존 유틸리티 재사용 가능 여부 확인
  - 매장 관련: `findDuplicateStore`, `sanitizeAddress`, `calcOfficeDistance`
  - 인증: `getSession()` from `@/lib/auth`
  - DB: `prisma` from `@/lib/prisma`
- 기존 컴포넌트 재사용 가능 여부 확인
  - `StoreCard`, `StoreSlideOver`, `LoginPromptModal`

### 3. 리스크 식별
- DB 스키마 변경 → 마이그레이션 필요
- API 응답 형식 변경 → 클라이언트 타입 업데이트 필요
- 새 환경 변수 → `.env.local` + Vercel 설정 필요

### 4. 계획 문서화

```markdown
## 작업 계획

### 수정 파일
- `src/app/api/.../route.ts` — [이유]
- `src/components/.../Component.tsx` — [이유]

### 신규 파일
- `src/app/api/.../route.ts` — [역할]

### DB 변경
- `prisma/schema.prisma` — [변경 내용]
- 마이그레이션: `prisma migrate dev --name <이름>`

### 검증 방법
- [ ] tsc --noEmit 에러 0개
- [ ] 브라우저에서 [기능] 동작 확인
```

## 계획 금지 사항

- 요청하지 않은 기능 추가 계획
- 불필요한 추상화 계획
- 미래 요구사항 대비 over-engineering
