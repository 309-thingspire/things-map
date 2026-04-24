# Skill: Review

## 검토 절차

### 1. 타입 체크

```bash
export PATH="$HOME/.local/node/node-v22.22.2-darwin-arm64/bin:$PATH"
node node_modules/typescript/bin/tsc --noEmit
```

에러가 있으면 즉시 수정. 배포 불가.

### 2. 기능별 체크리스트

#### API Route
- [ ] 인증 체크 있음 (`getSession()`)
- [ ] 관리자 전용이면 `role === 'ADMIN'` 체크
- [ ] 응답 형식 일관성 (`{ data }` / `{ error }`)
- [ ] try/catch로 500 처리
- [ ] params는 `await params` 사용 (Next.js 16)

#### 매장 데이터
- [ ] 생성 시 `findDuplicateStore()` 체크
- [ ] 주소 `sanitizeAddress()` 적용
- [ ] 좌표 `calcOfficeDistance()` 적용

#### 컴포넌트
- [ ] `'use client'` 필요 여부 판단
- [ ] Props 타입 정의됨
- [ ] 접근성 속성 있음 (button title 등)

#### DB 변경
- [ ] 마이그레이션 파일 있음
- [ ] `architecture.md` 반영됨

### 3. 완료 조건

모두 충족해야 작업 완료:

1. `tsc --noEmit` — 에러 0개
2. 브라우저 동작 확인 (핵심 경로)
3. 보안 체크 통과
4. `progress.md` 업데이트
5. 커밋 메시지 — `feat:` / `fix:` / `refactor:` 컨벤션

### 4. 커밋 메시지 컨벤션

```
feat: 새 기능 추가
fix: 버그 수정
refactor: 리팩토링 (동작 변경 없음)
chore: 설정, 의존성 변경
docs: 문서 변경
```

예:
```
feat: 띵봇 매장 카드 가로 스크롤 추가
fix: 오봉집 STORE ID 정규식 한글 매칭 오류 수정
```
