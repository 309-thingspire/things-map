import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 분석에서 제외할 한국어 불용어
const STOP_WORDS = new Set([
  '이','가','을','를','의','은','는','에','에서','으로','로','와','과','도','만',
  '에게','한테','부터','까지','이랑','랑','이나','든지','이든','거나','이면','이고',
  '그리고','하지만','그런데','그래서','그냥','좀','잠깐','또','이미','아직','자주',
  '주로','보통','가끔','이번','오늘','어제','내일','지금','방금',
  '어','아','네','예','뭐','뭔가','어디','거기','여기','저기',
  '나','너','우리','저','제','것','수','때','곳','한','할','해','하고','하면','해서',
  '있어','없어','좋아','싶어','먹고','가고','가서','이거','저거','그거',
  '있는','없는','좋은','싶은','하는','되는','같은','이런','저런','그런',
  '어떤','무슨','어느','이다','이에요','예요','입니다','있습니다','없습니다',
  '해주세요','주세요','알려주세요','추천해주세요','부탁해요','해줘','알려줘','추천해줘',
  '뭐가','어떤게','어디가','혹시','아무','몇','정도','대충','빨리','바로',
])

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const logs = await prisma.chatLog.findMany({
      select: { userMessage: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    if (logs.length === 0) {
      return NextResponse.json({ data: { keywords: [], totalMessages: 0, summary: [] } })
    }

    // ── 키워드 빈도 분석
    const wordCount = new Map<string, number>()

    for (const log of logs) {
      const words = log.userMessage
        .split(/[\s,?.!~^()\[\]{}"'`/\\|<>@#$%^&*+=:;]+/)
        .map((w) => w.trim().replace(/[^가-힣a-zA-Z0-9]/g, ''))
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))

      // 메시지당 한 번만 카운트 (단순 등장 여부)
      const seen = new Set(words)
      for (const word of seen) {
        wordCount.set(word, (wordCount.get(word) ?? 0) + 1)
      }
    }

    const keywords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([word, count]) => ({ word, count }))

    // ── 사용 패턴 요약: 최근 7일 vs 이전과 비교
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentLogs = logs.filter((l) => l.createdAt >= sevenDaysAgo)
    const recentWordCount = new Map<string, number>()
    for (const log of recentLogs) {
      const words = log.userMessage
        .split(/[\s,?.!~^()\[\]{}"'`/\\|<>@#$%^&*+=:;]+/)
        .map((w) => w.trim().replace(/[^가-힣a-zA-Z0-9]/g, ''))
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
      const seen = new Set(words)
      for (const word of seen) {
        recentWordCount.set(word, (recentWordCount.get(word) ?? 0) + 1)
      }
    }

    // 최근 7일 급상승 키워드 (전체 대비 비율이 높은 것)
    const trending = Array.from(recentWordCount.entries())
      .filter(([word]) => (wordCount.get(word) ?? 0) >= 2)
      .map(([word, recentCnt]) => ({
        word,
        recentCnt,
        totalCnt: wordCount.get(word) ?? 0,
        ratio: recentCnt / Math.max(wordCount.get(word) ?? 1, 1),
      }))
      .sort((a, b) => b.recentCnt - a.recentCnt)
      .slice(0, 5)

    return NextResponse.json({
      data: {
        keywords,
        totalMessages: logs.length,
        recentMessages: recentLogs.length,
        trending,
      },
    })
  } catch (err) {
    console.error('[chat-keywords]', err)
    return NextResponse.json({ data: { keywords: [], totalMessages: 0, recentMessages: 0, trending: [] } })
  }
}
