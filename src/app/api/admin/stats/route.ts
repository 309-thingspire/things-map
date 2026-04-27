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
  const thirtyDaysAgo = new Date(todayStart)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

  // 관리자 제외: 일반 사용자 ID 목록 미리 확보
  const regularUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true },
  })
  const regularUserIds = regularUsers.map((u) => u.id)

  const [
    storeCount, userCount, pendingRequests,
    dauLogins, mauLogins,
    recentLogins7, recentLogins30,
    topViewGroups, allStoreViewGroups,
    todayVisits, monthVisits,
    users,
    reviewDimensions,
    categories,
    recentStores,
    allActiveStoreCategories,
  ] = await Promise.all([
    prisma.store.count({ where: { status: 'ACTIVE' } }),

    // 활성 일반 사용자 수 (관리자 제외)
    prisma.user.count({ where: { isActive: true, role: 'USER' } }),

    prisma.storeRequest.count({ where: { status: 'PENDING' } }),

    // DAU: 오늘 로그인한 고유 유저 (관리자 제외)
    prisma.userLogin.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: todayStart }, userId: { in: regularUserIds } },
    }),

    // MAU: 이번 달 로그인한 고유 유저 (관리자 제외)
    prisma.userLogin.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: monthStart }, userId: { in: regularUserIds } },
    }),

    // 최근 7일 로그인 이력 (관리자 제외)
    prisma.userLogin.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, userId: { in: regularUserIds } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 최근 30일 로그인 이력 (관리자 제외)
    prisma.userLogin.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, userId: { in: regularUserIds } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 인기 매장: StoreView 기준 top 20
    prisma.storeView.groupBy({
      by: ['storeId'],
      _count: { storeId: true },
      orderBy: { _count: { storeId: 'desc' } },
      take: 20,
    }),

    // 카테고리 통계용 전체 StoreView
    prisma.storeView.groupBy({
      by: ['storeId'],
      _count: { storeId: true },
    }),

    // 오늘 방문자 (고유 sessionId)
    prisma.pageVisit.groupBy({ by: ['sessionId'], where: { createdAt: { gte: todayStart } } }),

    // 이번 달 방문자
    prisma.pageVisit.groupBy({ by: ['sessionId'], where: { createdAt: { gte: monthStart } } }),

    // 계정별 통계 (관리자 제외)
    prisma.user.findMany({
      where: { isActive: true, role: 'USER' },
      select: {
        id: true, name: true, team: true, lastLogin: true,
        _count: { select: { reviews: true, requests: true, logins: true } },
      },
      orderBy: { name: 'asc' },
    }),

    // 리뷰 점수 차원별 평균
    prisma.review.aggregate({
      where: { status: 'ACTIVE' },
      _avg: {
        scoreTotal: true,
        scoreTaste: true,
        scorePrice: true,
        scoreService: true,
        scoreAmbiance: true,
        scoreCleanliness: true,
      },
      _count: { id: true },
    }),

    // 카테고리 목록 + 매장 수
    prisma.category.findMany({
      select: {
        id: true, name: true, color: true,
        _count: { select: { stores: true } },
      },
      orderBy: { name: 'asc' },
    }),

    // 최근 등록 매장
    prisma.store.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, name: true, address: true, createdAt: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    // 카테고리 조회 집계용: 모든 활성 매장의 categoryId
    prisma.store.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, categoryId: true },
    }),
  ])

  // 7일 DAU 트렌드
  const dauTrend: { date: string; count: number }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const dateStr = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    const unique = new Set(
      recentLogins7.filter((l) => l.createdAt >= d && l.createdAt < next).map((l) => l.userId)
    ).size
    dauTrend.push({ date: dateStr, count: unique })
  }

  // 30일 DAU 트렌드
  const dauTrend30: { date: string; count: number }[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const dateStr = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    const unique = new Set(
      recentLogins30.filter((l) => l.createdAt >= d && l.createdAt < next).map((l) => l.userId)
    ).size
    dauTrend30.push({ date: dateStr, count: unique })
  }

  // 팀별 통계 (users는 이미 관리자 제외)
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

  // 오늘 방문자 중 비로그인
  const todayLoggedIn = new Set(dauLogins.map((l) => l.userId)).size
  const todayAnon = todayVisits.length - todayLoggedIn

  // 카테고리별 뷰 집계: storeId → categoryId 매핑 후 합산
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
      id: cat.id,
      name: cat.name,
      color: cat.color,
      storeCount: cat._count.stores,
      viewCount: catViewMap.get(cat.id) ?? 0,
    }))
    .filter((c) => c.storeCount > 0)
    .sort((a, b) => b.viewCount - a.viewCount)

  return NextResponse.json({
    data: {
      summary: { storeCount, userCount, pendingRequests },
      dau: dauLogins.length,
      mau: mauLogins.length,
      visitors: { today: todayVisits.length, todayAnon: Math.max(0, todayAnon), month: monthVisits.length },
      dauTrend,
      dauTrend30,
      popularStores,
      teamStats,
      reviewDimensions: {
        count: reviewDimensions._count.id,
        avg: {
          total: reviewDimensions._avg.scoreTotal ?? 0,
          taste: reviewDimensions._avg.scoreTaste ?? 0,
          price: reviewDimensions._avg.scorePrice ?? 0,
          service: reviewDimensions._avg.scoreService ?? 0,
          ambiance: reviewDimensions._avg.scoreAmbiance ?? 0,
          cleanliness: reviewDimensions._avg.scoreCleanliness ?? 0,
        },
      },
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
}
