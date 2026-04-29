import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 로그인 기록(UserLogin)·계정(User)·매장·카테고리·메뉴는 유지
    // FK 의존 순서대로 삭제
    const [
      chatLogs,
      reviews,
      favorites,
      requests,
      storeViews,
      pageVisits,
      stagingStores,
      crawlJobs,
    ] = await Promise.all([
      prisma.chatLog.deleteMany({}),
      prisma.review.deleteMany({}),
      prisma.userFavorite.deleteMany({}),
      prisma.storeRequest.deleteMany({}),
      prisma.storeView.deleteMany({}),
      prisma.pageVisit.deleteMany({}),
      prisma.stagingStore.deleteMany({}),
      prisma.crawlJob.deleteMany({}),
    ])

    // 리뷰 삭제 후 집계 초기화
    await prisma.internalRating.updateMany({
      data: {
        avgTotal: 0,
        avgTaste: 0,
        avgPrice: 0,
        avgService: 0,
        avgAmbiance: 0,
        avgCleanliness: 0,
        reviewCount: 0,
      },
    })

    // 즐겨찾기 수 초기화
    await prisma.store.updateMany({
      data: { favoriteCount: 0 },
    })

    return NextResponse.json({
      data: {
        deleted: {
          chatLogs: chatLogs.count,
          reviews: reviews.count,
          favorites: favorites.count,
          requests: requests.count,
          storeViews: storeViews.count,
          pageVisits: pageVisits.count,
          stagingStores: stagingStores.count,
          crawlJobs: crawlJobs.count,
        },
      },
    })
  } catch (err) {
    console.error('[reset-data]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
