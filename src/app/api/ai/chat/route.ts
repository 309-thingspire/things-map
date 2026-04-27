import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3.5:4b'
const CACHE_TTL = 5 * 60 * 1000

// 숫자 인덱스 → 실제 storeId 매핑 포함
let storeCache: { data: string; indexMap: Record<string, string>; ts: number } | null = null

async function buildStoreContext(): Promise<{ context: string; indexMap: Record<string, string> }> {
  if (storeCache && Date.now() - storeCache.ts < CACHE_TTL) {
    return { context: storeCache.data, indexMap: storeCache.indexMap }
  }

  const stores = await prisma.store.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: { select: { name: true } },
      menus: { select: { name: true, price: true, isRepresentative: true } },
    },
    orderBy: { name: 'asc' },
  })

  const indexMap: Record<string, string> = {}

  const lines = stores.map((s, i) => {
    const idx = String(i + 1)
    indexMap[idx] = s.id
    const menus = s.menus.length
      ? s.menus.map((m) => `${m.name}${m.price ? `(${m.price.toLocaleString()}원)` : ''}`).join(', ')
      : ''
    const tags = s.themeTags.join(', ')
    return [
      `[ID:${idx}]`,   // 짧은 숫자 인덱스 사용
      s.name,
      s.category?.name ? `카테고리:${s.category.name}` : '',
      `주소:${s.address}`,
      s.walkingMinutes ? `도보:${s.walkingMinutes}분` : '',
      tags ? `테마:${tags}` : '',
      menus ? `메뉴:${menus}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
  })

  const data = lines.join('\n')
  storeCache = { data, indexMap, ts: Date.now() }
  return { context: data, indexMap }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages } = await request.json() as { messages: { role: string; content: string }[] }
  const { context: storeContext, indexMap } = await buildStoreContext()

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  const systemPrompt = `당신은 띵봇입니다. 회사 근처 맛집/카페/식당을 친근하게 추천해주는 어시스턴트예요 😊

## 등록된 매장 목록
${storeContext}

## 규칙
1. 반드시 위 목록에 있는 매장만 추천하세요.
2. 추천은 최대 3개까지만 하세요.
3. 매장을 언급할 때는 반드시 **같은 줄**에 [STORE:번호] 태그를 붙이세요. 번호는 위 목록의 [ID:번호]와 정확히 일치해야 합니다.
   올바른 예: - **카페노티드** [STORE:5] — 커피가 맛있어요
   잘못된 예: - **카페노티드**\n[STORE:5]  ← 줄바꿈 금지
4. 목록 항목(-) 안에 내용을 함께 작성하세요. 빈 항목(-만 있는 줄) 금지.
5. 답변은 짧고 핵심만. 친근하고 따뜻한 말투로.
6. 마크다운 사용: **굵게**, ## 제목, - 목록.
7. 위 목록에 없는 질문(날씨, 주식 등)은 "등록된 매장 정보만 알아요 😊"라고만 답하세요.
8. 한국어로만 답하세요.`

  const ollamaMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  let ollamaRes: Response
  try {
    ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: true,
        think: false,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Ollama 서버에 연결할 수 없습니다.' }, { status: 502 })
  }

  if (!ollamaRes.ok || !ollamaRes.body) {
    return NextResponse.json({ error: 'Ollama 응답 오류' }, { status: 502 })
  }

  const upstreamBody = ollamaRes.body
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const json = JSON.parse(line)
              const token: string = json.message?.content ?? ''
              if (token) {
                fullResponse += token
                controller.enqueue(new TextEncoder().encode(token))
              }
            } catch {
              // malformed JSON line, skip
            }
          }
        }
        // 스트리밍 완료 후 숫자→실제ID 매핑을 클라이언트에 전송
        // 클라이언트는 이 라인을 파싱해 [STORE:숫자]를 실제 ID로 치환함
        const mapLine = `\n[STORE_MAP:${JSON.stringify(indexMap)}]`
        controller.enqueue(new TextEncoder().encode(mapLine))
      } finally {
        controller.close()
        // 대화 로그 저장 (fire-and-forget) — indexMap으로 실제 storeId 추출
        const storeIds = [...new Set(
          [...fullResponse.matchAll(/\[STORE:(\w+)\]/g)]
            .map((m) => indexMap[m[1]] ?? m[1])
            .filter(Boolean)
        )]
        prisma.chatLog.create({
          data: {
            userId: session.userId,
            userMessage: lastUserMessage,
            assistantMessage: fullResponse,
            storeIds,
          },
        }).catch(() => {})
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
