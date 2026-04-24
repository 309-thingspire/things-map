# Agent: Scaffolder

## 역할

새로운 기능의 보일러플레이트 파일과 초기 구조를 생성하는 에이전트.

## 신규 API Route 생성 패턴

```
src/app/api/<리소스>/route.ts
src/app/api/<리소스>/[id]/route.ts
```

**route.ts 템플릿:**
```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await prisma.<모델>.findMany({ where: {} })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
```

## 신규 컴포넌트 생성 패턴

**클라이언트 컴포넌트:**
```tsx
'use client'

import { useState } from 'react'

interface <이름>Props {
  // props 정의
}

export default function <이름>({ }: <이름>Props) {
  return <div></div>
}
```

**서버 컴포넌트:**
```tsx
interface <이름>Props {
  // props 정의
}

export default function <이름>({ }: <이름>Props) {
  return <div></div>
}
```

## 신규 Prisma 모델 추가 시

1. `prisma/schema.prisma`에 모델 추가
2. 마이그레이션 실행:
   ```bash
   node node_modules/.bin/prisma migrate dev --name <설명>
   ```
3. `architecture.md` 데이터 모델 섹션 업데이트

## 신규 훅 생성 패턴

```ts
// src/hooks/use<이름>.ts
import { useState, useEffect } from 'react'

export function use<이름>() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/<경로>')
      .then(r => r.json())
      .then(d => setData(d.data))
  }, [])

  return { data }
}
```

## 관리자 페이지 추가 시

1. `src/app/admin/<기능>/page.tsx` 생성
2. `src/app/admin/layout.tsx`의 사이드바 링크 추가
3. `src/app/api/admin/<기능>/route.ts` 생성
4. 미들웨어 인증 확인 (`src/middleware.ts`)

## 금지 패턴

- `pages/` 디렉토리에 파일 생성
- `src/app/api/` 외부에 API 로직 작성
- 환경 변수를 코드에 하드코딩
