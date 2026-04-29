import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const maxDuration = 60

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3.5:4b'
const CACHE_TTL = 5 * 60 * 1000

// 매장명 → 실제 storeId 매핑 (숫자 인덱스 방식 폐기 — AI가 번호를 혼동하는 근본 원인)
let storeCache: { data: string; nameToId: Record<string, string>; ts: number } | null = null

async function buildStoreContext(): Promise<{ context: string; nameToId: Record<string, string> }> {
  if (storeCache && Date.now() - storeCache.ts < CACHE_TTL) {
    return { context: storeCache.data, nameToId: storeCache.nameToId }
  }

  const stores = await prisma.store.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: { select: { name: true } },
      menus: {
        where: { isRepresentative: true },
        select: { name: true },
        take: 3,
      },
    },
    orderBy: { name: 'asc' },
  })

  const nameToId: Record<string, string> = {}

  const lines = stores.map((s) => {
    nameToId[s.name] = s.id
    const menus = s.menus.length ? s.menus.map((m) => m.name).join(', ') : ''
    const tags = s.themeTags.slice(0, 3).join(', ')
    return [
      s.name,
      s.category?.name ? `카테고리:${s.category.name}` : '',
      s.walkingMinutes ? `도보:${s.walkingMinutes}분` : '',
      tags ? `테마:${tags}` : '',
      menus ? `메뉴:${menus}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
  })

  const data = lines.join('\n')
  storeCache = { data, nameToId, ts: Date.now() }
  return { context: data, nameToId }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages } = await request.json() as { messages: { role: string; content: string }[] }
  const { context: storeContext, nameToId } = await buildStoreContext()

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  // 첫 메시지일 때만 이전 대화 기억 주입 (DB 조회)
  let memoryContext = ''
  if (messages.length === 1) {
    const recentLogs = await prisma.chatLog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { userMessage: true },
    })
    if (recentLogs.length > 0) {
      const topics = recentLogs.map((l) => l.userMessage.slice(0, 60)).join(' / ')
      memoryContext = `\n[참고: 이 사용자가 최근에 찾았던 것: ${topics}]`
    }
  }

  const systemPrompt = `당신은 띵봇입니다. 회사 근처 맛집/카페/식당을 친근하게 추천해주는 어시스턴트예요 😊${memoryContext}

## 등록된 매장 목록
${storeContext}

## 규칙
1. 반드시 위 목록에 있는 매장만 추천하세요.
2. 추천은 최대 3개까지만 하세요.
3. 매장을 언급할 때는 반드시 **같은 줄**에 [STORE:정확한매장명] 태그를 붙이세요. 매장명은 위 목록과 글자 하나도 다르지 않게 정확히 일치해야 합니다.
   올바른 예: - **갈월이골목** [STORE:갈월이골목] — 분위기 좋아요
   잘못된 예: - **갈월이골목**\n[STORE:갈월이골목]  ← 줄바꿈 금지
4. 목록 항목(-) 안에 내용을 함께 작성하세요. 빈 항목(-만 있는 줄) 금지.
5. 답변은 짧고 핵심만. 친근하고 따뜻한 말투로.
6. 마크다운 사용: **굵게**, ## 제목, - 목록.
7. 카페·커피·음료·디저트를 명시적으로 요청할 때만 카페 카테고리 포함. 식사/밥/점심/저녁 추천에는 카페 제외.
8. 위 목록에 없는 질문(날씨, 주식 등)은 "등록된 매장 정보만 알아요 😊"라고만 답하세요.
9. 한국어로만 답하세요.`

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
        options: { num_predict: 400 },
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
  let resolvedStoreIds: string[] = []

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

        // 매장명 기반으로 실제 ID 추출 — 번호 혼동 없이 정확하게 매핑
        resolvedStoreIds = [...new Set(
          [...fullResponse.matchAll(/\[STORE:([^\]]+)\]/g)]
            .map((m) => nameToId[m[1].trim()])
            .filter((id): id is string => !!id)
        )]

        // 실제 ID 목록만 전송 (클라이언트에서 매핑 불필요)
        controller.enqueue(new TextEncoder().encode(`\n[STORE_IDS:${JSON.stringify(resolvedStoreIds)}]`))
      } finally {
        controller.close()
        prisma.chatLog.create({
          data: {
            userId: session.userId,
            userMessage: lastUserMessage,
            assistantMessage: fullResponse,
            storeIds: resolvedStoreIds,
          },
        }).catch(() => {})
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
