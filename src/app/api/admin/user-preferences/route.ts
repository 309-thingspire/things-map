import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface CategoryScore {
  categoryId: string
  categoryName: string
  color: string | null
  views: number
  favorites: number
  reviews: number
  avgScore: number | null
  score: number
}

interface UserPreference {
  userId: string
  userName: string
  team: string
  topCategories: CategoryScore[]
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [users, views, favorites, reviews] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: 'USER' },
      select: { id: true, name: true, team: true },
      orderBy: { name: 'asc' },
    }),
    prisma.storeView.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      select: {
        userId: true,
        store: { select: { category: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.userFavorite.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      select: {
        userId: true,
        store: { select: { category: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.review.findMany({
      where: { status: 'ACTIVE', createdAt: { gte: ninetyDaysAgo } },
      select: {
        userId: true,
        scoreTotal: true,
        store: { select: { category: { select: { id: true, name: true, color: true } } } },
      },
    }),
  ])

  const result: UserPreference[] = users.map((user) => {
    // category map: categoryId → aggregated scores
    const catMap = new Map<string, { cat: { id: string; name: string; color: string | null }; views: number; favorites: number; reviewScores: number[] }>()

    for (const v of views) {
      if (v.userId !== user.id || !v.store.category) continue
      const c = v.store.category
      const entry = catMap.get(c.id) ?? { cat: c, views: 0, favorites: 0, reviewScores: [] }
      entry.views++
      catMap.set(c.id, entry)
    }
    for (const f of favorites) {
      if (f.userId !== user.id || !f.store.category) continue
      const c = f.store.category
      const entry = catMap.get(c.id) ?? { cat: c, views: 0, favorites: 0, reviewScores: [] }
      entry.favorites++
      catMap.set(c.id, entry)
    }
    for (const r of reviews) {
      if (r.userId !== user.id || !r.store.category) continue
      const c = r.store.category
      const entry = catMap.get(c.id) ?? { cat: c, views: 0, favorites: 0, reviewScores: [] }
      entry.reviewScores.push(r.scoreTotal)
      catMap.set(c.id, entry)
    }

    const topCategories: CategoryScore[] = Array.from(catMap.values())
      .map(({ cat, views: v, favorites: f, reviewScores }) => {
        const reviews = reviewScores.length
        const avgScore = reviews > 0 ? reviewScores.reduce((a, b) => a + b, 0) / reviews : null
        const score = v * 1 + f * 3 + reviews * 5
        return { categoryId: cat.id, categoryName: cat.name, color: cat.color, views: v, favorites: f, reviews, avgScore, score }
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return { userId: user.id, userName: user.name, team: user.team, topCategories }
  }).filter((u) => u.topCategories.length > 0)

  return NextResponse.json({ data: result })
}
