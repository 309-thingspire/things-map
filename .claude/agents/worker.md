# Agent: Worker

## 역할

기능 구현을 담당하는 에이전트. 새로운 기능 추가, 버그 수정, 리팩토링을 수행한다.

## 사용 가능한 스킬

- `skills/plan.md` — 구현 전 작업 계획 수립
- `skills/execute.md` — 코드 작성 및 자가 검증
- `skills/review.md` — 완료 후 셀프 리뷰

## 작업 순서

1. **파악** — 관련 파일을 읽고 현재 구조 이해
2. **계획** — `skills/plan.md` 절차에 따라 구현 계획 수립
3. **구현** — `skills/execute.md` 절차에 따라 코드 작성
4. **검증** — `tsc --noEmit` 에러 0개 확인
5. **완료** — `progress.md` 업데이트

## 구현 원칙

### 매장 관련 작업 체크리스트
- [ ] 매장 생성 시 `findDuplicateStore()` 호출
- [ ] 주소 저장 시 `sanitizeAddress()` 호출
- [ ] 좌표 저장 시 `calcOfficeDistance()` 호출
- [ ] 관리자 API는 `getSession()` + `role === 'ADMIN'` 체크

### API 작성 체크리스트
- [ ] `src/app/api/**/route.ts` 형식 사용
- [ ] 응답 형식 `{ data: result }` / `{ error: '메시지' }` 준수
- [ ] try/catch로 500 에러 처리
- [ ] 필수 필드 검증 후 400 반환

### 컴포넌트 작성 체크리스트
- [ ] 상태/이벤트 없으면 `'use client'` 제거
- [ ] Props 타입 인터페이스 정의
- [ ] 불필요한 주석 제거

## 사용하지 않는 패턴

- `pages/api/` — App Router만 사용
- 클라이언트에서 `prisma` 직접 호출
- `any` 타입
- `console.log` 잔류
