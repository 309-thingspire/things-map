# Skill: Execute

## 실행 절차

### 1. 파일 읽기 (수정 전 필수)
- 수정할 파일은 반드시 먼저 Read 도구로 읽기
- 관련 파일 (타입 정의, 호출부 등)도 확인

### 2. 코드 작성
- 기존 코드 스타일 유지
- 타입 명시 (추론 불가 시)
- 에러 처리 포함 (try/catch)

### 3. DB 스키마 변경 시 순서

```bash
# 1. schema.prisma 수정
# 2. 마이그레이션 실행
PATH="$HOME/.local/node/node-v22.22.2-darwin-arm64/bin:$PATH"
node node_modules/.bin/prisma migrate dev --name <설명>

# 3. 클라이언트 자동 재생성 확인 (migrate dev가 자동 실행)
# 수동 재생성 시:
node node_modules/.bin/prisma generate
```

### 4. 자가 검증

```bash
export PATH="$HOME/.local/node/node-v22.22.2-darwin-arm64/bin:$PATH"

# TypeScript 타입 체크 — 에러 0개 필수
node node_modules/typescript/bin/tsc --noEmit
```

### 5. 완료 체크리스트

**항상 확인:**
- [ ] `tsc --noEmit` 에러 0개
- [ ] 미사용 import 없음
- [ ] `console.log` 없음

**매장 생성/수정 시:**
- [ ] `findDuplicateStore()` 호출
- [ ] `sanitizeAddress()` 호출
- [ ] `calcOfficeDistance()` 호출

**관리자 API 시:**
- [ ] `getSession()` + `role === 'ADMIN'` 체크

**DB 변경 시:**
- [ ] 마이그레이션 파일 생성됨
- [ ] `architecture.md` 업데이트

**신규 기능 시:**
- [ ] `progress.md` Todo 항목 완료 처리

## 자주 쓰는 패턴

### 인증 체크
```ts
const session = await getSession()
if (!session || session.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 매장 생성
```ts
const cleanAddress = sanitizeAddress(address)
const dup = await findDuplicateStore(name)
if (dup) return NextResponse.json({ error: `이미 등록된 매장입니다: ${dup.name}`, duplicateId: dup.id }, { status: 409 })
const { officeDistanceM, walkingMinutes } = calcOfficeDistance(lat, lng)
```

### params 처리 (Next.js 16 — Promise)
```ts
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```
