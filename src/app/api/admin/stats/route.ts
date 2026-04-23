import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const [
    storeCount, userCount, pendingRequests,
    dauLogins, mauLogins, recentLogins,
    topViewGroups, todayVisits, monthVisits, users,
  ] = await Promise.all([
    prisma.store.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.storeRequest.count({ where: { status: 'PENDING' } }),

    // DAU: 오늘 로그인한 고유 유저
    prisma.userLogin.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: todayStart } },
    }),

    // MAU: 이번 달 로그인한 고유 유저
    prisma.userLogin.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: monthStart } },
    }),

    // 최근 7일 로그인 이력 (일별 DAU 계산용)
    prisma.userLogin.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 인기 매장: StoreView 기준 top 10
    prisma.storeView.groupBy({
      by: ['storeId'],
      _count: { storeId: true },
      orderBy: { _count: { storeId: 'desc' } },
      take: 10,
    }),

    // 오늘 방문자 (고유 sessionId)
    prisma.pageVisit.groupBy({ by: ['sessionId'], where: { createdAt: { gte: todayStart } } }),

    // 이번 달 방문자
    prisma.pageVisit.groupBy({ by: ['sessionId'], where: { createdAt: { gte: monthStart } } }),

    // 계정별 통계
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, team: true, lastLogin: true,
        _count: { select: { reviews: true, requests: true, logins: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // 7일 DAU 트렌드: 날짜별 고유 유저 수
  const dauTrend: { date: string; count: number }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const dateStr = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    const dayLogins = recentLogins.filter(
      (l) => l.createdAt >= d && l.createdAt < next
    )
    const unique = new Set(dayLogins.map((l) => l.userId)).size
    dauTrend.push({ date: dateStr, count: unique })
  }

  // 인기 매장 상세 정보
  const storeIds = topViewGroups.map((g) => g.storeId)
  const [storeDetails, chatViewGroups] = await Promise.all([
    prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: {
        id: true, name: true,
        category: { select: { name: true, color: true } },
        internalRating: { select: { avgTotal: true, reviewCount: true } },
        walkingMinutes: true,
        favoriteCount: true,
      },
    }),
    prisma.storeView.groupBy({
      by: ['storeId'],
      where: { storeId: { in: storeIds }, source: 'chat' },
      _count: { storeId: true },
    }),
  ])

  // StoreView가 없는 경우 리뷰 기준 폴백 (리뷰 많은 순)
  const topStoresFromViews = topViewGroups.map((g) => ({
    ...storeDetails.find((s) => s.id === g.storeId)!,
    viewCount: g._count.storeId,
    chatCount: chatViewGroups.find((c) => c.storeId === g.storeId)?._count.storeId ?? 0,
  })).filter(Boolean)

  let popularStores = topStoresFromViews
  if (popularStores.length < 10) {
    const reviewBased = await prisma.store.findMany({
      where: { status: 'ACTIVE', id: { notIn: storeIds } },
      select: {
        id: true, name: true,
        category: { select: { name: true, color: true } },
        internalRating: { select: { avgTotal: true, reviewCount: true } },
        walkingMinutes: true,
        favoriteCount: true,
      },
      orderBy: { internalRating: { reviewCount: 'desc' } },
      take: 10 - popularStores.length,
    })
    popularStores = [
      ...popularStores,
      ...reviewBased.map((s) => ({ ...s, viewCount: 0, chatCount: 0 })),
    ]
  }

  // 오늘 방문자 중 비로그인 비율
  const todayLoggedIn = new Set(dauLogins.map(l => l.userId)).size
  const todayAnon = todayVisits.length - todayLoggedIn

  return NextResponse.json({
    data: {
      summary: { storeCount, userCount, pendingRequests },
      dau: dauLogins.length,
      mau: mauLogins.length,
      visitors: { today: todayVisits.length, todayAnon: Math.max(0, todayAnon), month: monthVisits.length },
      dauTrend,
      popularStores,
      userStats: users.map((u) => ({
        id: u.id, name: u.name, team: u.team,
        lastLogin: u.lastLogin,
        loginCount: u._count.logins,
        reviewCount: u._count.reviews,
        requestCount: u._count.requests,
      })),
    },
  })
}
