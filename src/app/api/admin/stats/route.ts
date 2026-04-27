import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const thirtyDaysAgo = new Date(todayStart)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const sixMonthsAgo = new Date(todayStart)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  // 관리자 제외: 일반 사용자 ID 목록
  const regularUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true },
  })
  const regularUserIds = regularUsers.map((u) => u.id)

  const [
    storeCount, userCount, pendingRequests, approvedRequests, rejectedRequests,
    dauLogins, mauLogins,
    recentLogins7, recentLogins30,
    topViewGroups, allStoreViewGroups,
    todayVisits, monthVisits,
    users,
    categories,
    recentStores,
    allActiveStoreCategories,
    newUsersRaw,
  ] = await Promise.all([
    prisma.store.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { isActive: true, role: 'USER' } }),
    prisma.storeRequest.count({ where: { status: 'PENDING' } }),
    prisma.storeRequest.count({ where: { status: 'APPROVED' } }),
    prisma.storeRequest.count({ where: { status: 'REJECTED' } }),

    prisma.userLogin.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: todayStart }, userId: { in: regularUserIds } },
    }),
    prisma.userLogin.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: monthStart }, userId: { in: regularUserIds } },
    }),

    prisma.userLogin.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, userId: { in: regularUserIds } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userLogin.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, userId: { in: regularUserIds } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    prisma.storeView.groupBy({
      by: ['storeId'],
      _count: { storeId: true },
      orderBy: { _count: { storeId: 'desc' } },
      take: 20,
    }),
    prisma.storeView.groupBy({
      by: ['storeId'],
      _count: { storeId: true },
    }),

    prisma.pageVisit.groupBy({ by: ['sessionId'], where: { createdAt: { gte: todayStart } } }),
    prisma.pageVisit.groupBy({ by: ['sessionId'], where: { createdAt: { gte: monthStart } } }),

    prisma.user.findMany({
      where: { isActive: true, role: 'USER' },
      select: {
        id: true, name: true, team: true, lastLogin: true,
        _count: { select: { reviews: true, requests: true, logins: true } },
      },
      orderBy: { name: 'asc' },
    }),

    prisma.category.findMany({
      select: { id: true, name: true, color: true, _count: { select: { stores: true } } },
      orderBy: { name: 'asc' },
    }),

    prisma.store.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, name: true, address: true, createdAt: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    prisma.store.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, categoryId: true },
    }),

    // 신규 유저 등록 트렌드 (최근 6개월)
    prisma.user.findMany({
      where: { role: 'USER', createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // ── 챗봇 로그 (새 테이블 — 마이그레이션 미반영 서버에서도 안전하게)
  type ChatLogRow = { userId: string; createdAt: Date; storeIds: string[] }
  let chatLogsRaw: ChatLogRow[] = []
  let chatMentionedStoreIds: { storeIds: string[] }[] = []
  let chatTotalCount = 0
  try {
    ;[chatLogsRaw, chatMentionedStoreIds, chatTotalCount] = await Promise.all([
      prisma.chatLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true, createdAt: true, storeIds: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.chatLog.findMany({
        where: { storeIds: { isEmpty: false } },
        select: { storeIds: true },
      }),
      prisma.chatLog.count(),
    ])
  } catch {
    // 서버 재시작 전 Prisma 클라이언트 미반영 상태에서 안전하게 빈값 반환
  }

  // ── 7일 DAU 트렌드
  const dauTrend: { date: string; count: number }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const dateStr = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    const unique = new Set(recentLogins7.filter((l) => l.createdAt >= d && l.createdAt < next).map((l) => l.userId)).size
    dauTrend.push({ date: dateStr, count: unique })
  }

  // ── 30일 DAU 트렌드
  const dauTrend30: { date: string; count: number }[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const dateStr = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    const unique = new Set(recentLogins30.filter((l) => l.createdAt >= d && l.createdAt < next).map((l) => l.userId)).size
    dauTrend30.push({ date: dateStr, count: unique })
  }

  // ── 시간대별 접속 분포 (최근 30일, KST = UTC+9)
  const hourCounts = new Array(24).fill(0)
  for (const login of recentLogins30) {
    const hourKST = (login.createdAt.getUTCHours() + 9) % 24
    hourCounts[hourKST]++
  }
  const hourlyStats = hourCounts.map((count, hour) => ({ hour, count }))

  // ── 팀별 통계
  const teamMap = new Map<string, { memberCount: number; loginCount: number; reviewCount: number; requestCount: number }>()
  for (const u of users) {
    const team = u.team || '미지정'
    const entry = teamMap.get(team) ?? { memberCount: 0, loginCount: 0, reviewCount: 0, requestCount: 0 }
    entry.memberCount++
    entry.loginCount += u._count.logins
    entry.reviewCount += u._count.reviews
    entry.requestCount += u._count.requests
    teamMap.set(team, entry)
  }
  const teamStats = Array.from(teamMap.entries())
    .map(([team, s]) => ({ team, ...s }))
    .sort((a, b) => b.loginCount - a.loginCount)

  // ── 신규 유저 트렌드 (월별)
  const monthMap = new Map<string, number>()
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo)
    d.setMonth(d.getMonth() + i)
    monthMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0)
  }
  for (const u of newUsersRaw) {
    const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
  }
  const newUserTrend = Array.from(monthMap.entries()).map(([month, count]) => ({
    month: `${parseInt(month.split('-')[1])}월`,
    count,
  }))

  // ── 챗봇 분석
  const chatDayMap = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    chatDayMap.set(d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }), 0)
  }
  for (const log of chatLogsRaw) {
    const key = log.createdAt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    if (chatDayMap.has(key)) chatDayMap.set(key, (chatDayMap.get(key) ?? 0) + 1)
  }
  const chatDailyTrend = Array.from(chatDayMap.entries()).map(([date, count]) => ({ date, count }))

  // 챗봇에서 가장 많이 언급된 매장 집계
  const mentionMap = new Map<string, number>()
  for (const log of chatMentionedStoreIds) {
    for (const sid of log.storeIds) {
      mentionMap.set(sid, (mentionMap.get(sid) ?? 0) + 1)
    }
  }
  const topMentionedIds = Array.from(mentionMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const topChatStoreDetails = topMentionedIds.length > 0
    ? await prisma.store.findMany({
        where: { id: { in: topMentionedIds } },
        select: { id: true, name: true, category: { select: { name: true, color: true } } },
      })
    : []

  const topChatStores = topMentionedIds.map((id) => ({
    storeId: id,
    name: topChatStoreDetails.find((s) => s.id === id)?.name ?? id,
    category: topChatStoreDetails.find((s) => s.id === id)?.category ?? null,
    count: mentionMap.get(id) ?? 0,
  }))

  const chatStats = {
    totalMessages: chatTotalCount,
    uniqueUsers: new Set(chatLogsRaw.map((l) => l.userId)).size,
    todayMessages: chatLogsRaw.filter((l) => l.createdAt >= todayStart).length,
    dailyTrend: chatDailyTrend,
    topStores: topChatStores,
  }

  // ── 인기 매장 상세
  const storeIds = topViewGroups.map((g) => g.storeId)
  const [storeDetails, chatViewGroups] = await Promise.all([
    prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: {
        id: true, name: true,
        category: { select: { name: true, color: true } },
        internalRating: { select: { avgTotal: true, reviewCount: true } },
        walkingMinutes: true, favoriteCount: true,
      },
    }),
    prisma.storeView.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, source: 'chat' },
      _count: { storeId: true },
    }),
  ])

  const topStoresFromViews = topViewGroups
    .map((g) => ({
      ...storeDetails.find((s) => s.id === g.storeId)!,
      viewCount: g._count.storeId,
      chatCount: chatViewGroups.find((c) => c.storeId === g.storeId)?._count.storeId ?? 0,
    }))
    .filter(Boolean)

  let popularStores = topStoresFromViews
  if (popularStores.length < 10) {
    const reviewBased = await prisma.store.findMany({
      where: { status: 'ACTIVE', id: { notIn: storeIds } },
      select: {
        id: true, name: true,
        category: { select: { name: true, color: true } },
        internalRating: { select: { avgTotal: true, reviewCount: true } },
        walkingMinutes: true, favoriteCount: true,
      },
      orderBy: { internalRating: { reviewCount: 'desc' } },
      take: 10 - popularStores.length,
    })
    popularStores = [...popularStores, ...reviewBased.map((s) => ({ ...s, viewCount: 0, chatCount: 0 }))]
  }

  // ── 방문자
  const todayLoggedIn = new Set(dauLogins.map((l) => l.userId)).size
  const todayAnon = todayVisits.length - todayLoggedIn

  // ── 카테고리별 뷰 집계
  const storeCatMap = new Map<string, string>()
  for (const s of allActiveStoreCategories) {
    if (s.categoryId) storeCatMap.set(s.id, s.categoryId)
  }
  const catViewMap = new Map<string, number>()
  for (const vc of allStoreViewGroups) {
    const catId = storeCatMap.get(vc.storeId)
    if (!catId) continue
    catViewMap.set(catId, (catViewMap.get(catId) ?? 0) + vc._count.storeId)
  }
  const categoryStats = categories
    .map((cat) => ({
      id: cat.id, name: cat.name, color: cat.color,
      storeCount: cat._count.stores,
      viewCount: catViewMap.get(cat.id) ?? 0,
    }))
    .filter((c) => c.storeCount > 0)
    .sort((a, b) => b.viewCount - a.viewCount)

  return NextResponse.json({
    data: {
      summary: { storeCount, userCount, pendingRequests },
      requestStats: { pending: pendingRequests, approved: approvedRequests, rejected: rejectedRequests },
      dau: dauLogins.length,
      mau: mauLogins.length,
      visitors: { today: todayVisits.length, todayAnon: Math.max(0, todayAnon), month: monthVisits.length },
      dauTrend,
      dauTrend30,
      hourlyStats,
      popularStores,
      teamStats,
      chatStats,
      newUserTrend,
      categoryStats,
      recentStores: recentStores.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      userStats: users.map((u) => ({
        id: u.id, name: u.name, team: u.team,
        lastLogin: u.lastLogin,
        loginCount: u._count.logins,
        reviewCount: u._count.reviews,
        requestCount: u._count.requests,
      })),
    },
  })
  } catch (err) {
    console.error('[admin/stats]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
