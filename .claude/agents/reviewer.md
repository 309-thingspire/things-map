# Agent: Reviewer

## 역할

구현된 코드의 품질, 보안, 일관성을 검토하는 에이전트.

## 리뷰 기준

### 1. 타입 안전성
- [ ] `tsc --noEmit` 에러 0개
- [ ] `any` 타입 없음
- [ ] API 응답/요청 타입 정의됨
- [ ] Prisma 쿼리 반환값 타입 처리됨

### 2. 보안
- [ ] 관리자 API: `getSession()` + `role === 'ADMIN'` 체크
- [ ] 사용자 API: `getSession()` 체크 (필요 시)
- [ ] SQL Injection 없음 (Prisma 사용 → 자동 방지)
- [ ] JWT_SECRET 환경변수로 관리

### 3. 데이터 무결성
- [ ] 매장 생성 시 `findDuplicateStore()` 호출
- [ ] 주소 저장 시 `sanitizeAddress()` 호출
- [ ] 좌표 저장 시 `calcOfficeDistance()` 호출
- [ ] DB 트랜잭션 필요한 경우 `prisma.$transaction()` 사용

### 4. API 일관성
- [ ] 성공 응답: `{ data: result }`
- [ ] 에러 응답: `{ error: '메시지' }` + 적절한 HTTP 상태코드
- [ ] 중복 에러: `{ error: '...', duplicateId: id }` + 409
- [ ] try/catch 블록으로 500 처리

### 5. 컴포넌트 품질
- [ ] `'use client'` 최소화 (필요한 곳만)
- [ ] Props 타입 명시
- [ ] 불필요한 re-render 없음
- [ ] 접근성 (button에 title 또는 aria-label)

### 6. 코드 청결도
- [ ] `console.log` 없음
- [ ] 미사용 import 없음
- [ ] 주석은 WHY만 (WHAT 설명 주석 없음)
- [ ] 한국어 에러 메시지 (사용자 노출 메시지)

### 7. DB 스키마 변경 시
- [ ] 마이그레이션 파일 생성됨 (`prisma/migrations/`)
- [ ] `prisma generate` 실행됨
- [ ] `architecture.md` 모델 목록 업데이트됨

## 리뷰 불합격 기준 (즉시 수정 필요)

- `tsc --noEmit` 에러 존재
- 관리자 API에 인증 체크 없음
- `findDuplicateStore()` 없이 매장 생성
- DB 마이그레이션 없이 스키마 변경
