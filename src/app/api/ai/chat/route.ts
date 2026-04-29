import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const maxDuration = 60

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3.5:4b'
const CACHE_TTL = 5 * 60 * 1000

interface StoreData {
  id: string
  name: string
  categoryName: string | null
  walkingMinutes: number | null
  themeTags: string[]
  menus: string[]
}

// raw 배열로 캐시 — 요청마다 순서를 셔플해서 AI 편향 방지
let storeCache: { stores: StoreData[]; nameToId: Record<string, string>; ts: number } | null = null

async function getStores(): Promise<{ stores: StoreData[]; nameToId: Record<string, string> }> {
  if (storeCache && Date.now() - storeCache.ts < CACHE_TTL) {
    return { stores: storeCache.stores, nameToId: storeCache.nameToId }
  }

  const raw = await prisma.store.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: { select: { name: true } },
      menus: {
        where: { isRepresentative: true },
        select: { name: true },
        take: 3,
      },
    },
  })

  const nameToId: Record<string, string> = {}
  const stores: StoreData[] = raw.map((s) => {
    nameToId[s.name] = s.id
    return {
      id: s.id,
      name: s.name,
      categoryName: s.category?.name ?? null,
      walkingMinutes: s.walkingMinutes,
      themeTags: s.themeTags.slice(0, 3),
      menus: s.menus.map((m) => m.name),
    }
  })

  storeCache = { stores, nameToId, ts: Date.now() }
  return { stores, nameToId }
}

/** Fisher-Yates 셔플 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatStores(stores: StoreData[]): string {
  return stores
    .map((s) =>
      [
        s.name,
        s.categoryName ? `카테고리:${s.categoryName}` : '',
        s.walkingMinutes ? `도보:${s.walkingMinutes}분` : '',
        s.themeTags.length ? `테마:${s.themeTags.join(', ')}` : '',
        s.menus.length ? `메뉴:${s.menus.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' | ')
    )
    .join('\n')
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages } = await request.json() as { messages: { role: string; content: string }[] }
  const { stores, nameToId } = await getStores()

  // 매 요청마다 매장 순서를 무작위로 섞어 AI 편향 방지
  const shuffledStores = shuffle(stores)
  const storeContext = formatStores(shuffledStores)

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  // 첫 메시지일 때만 이전 대화 기억 주입 (DB 조회)
  let memoryContext = ''
  let recentlyRecommendedNames: string[] = []
  if (messages.length === 1) {
    const [recentLogs, recentRecoLogs] = await Promise.all([
      prisma.chatLog.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { userMessage: true },
      }),
      // 최근 추천된 매장 ID 수집 (반복 추천 방지)
      prisma.chatLog.findMany({
        where: { userId: session.userId, storeIds: { isEmpty: false } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { storeIds: true },
      }),
    ])

    if (recentLogs.length > 0) {
      const topics = recentLogs.map((l) => l.userMessage.slice(0, 60)).join(' / ')
      memoryContext = `\n[참고: 이 사용자가 최근에 찾았던 것: ${topics}]`
    }

    // storeId → 매장명 역매핑
    const idToName = Object.fromEntries(Object.entries(nameToId).map(([n, id]) => [id, n]))
    const recentIds = [...new Set(recentRecoLogs.flatMap((l) => l.storeIds))].slice(0, 8)
    recentlyRecommendedNames = recentIds.map((id) => idToName[id]).filter(Boolean)
  }

  const avoidRule = recentlyRecommendedNames.length > 0
    ? `\n10. 최근 이미 추천한 매장(${recentlyRecommendedNames.join(', ')})은 이번에 제외하거나 가장 마지막 선택지로 두세요. 항상 다양한 매장을 돌아가며 추천하세요.`
    : '\n10. 매번 다양한 매장을 골고루 추천하세요. 특정 매장이 반복되지 않도록 하세요.'

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
9. 한국어로만 답하세요.${avoidRule}`

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
