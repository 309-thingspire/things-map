import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchKakao } from '@/lib/crawl/kakao'
import { searchNaver } from '@/lib/crawl/naver'

const KEYWORDS = ['맛집', '카페', '한식', '이탈리안', '스시', '라멘', '고기집', '브런치']

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { success: 0, failed: 0, total: 0 }

  for (const keyword of KEYWORDS) {
    for (const platform of ['KAKAO', 'NAVER'] as const) {
      try {
        const job = await prisma.crawlJob.create({
          data: { platform, keyword, source: 'API', status: 'RUNNING' },
        })

        const items =
          platform === 'KAKAO'
            ? await searchKakao(keyword)
            : await searchNaver(keyword)

        await Promise.all(
          items.map((r) =>
            prisma.stagingStore.create({
              data: {
                crawlJobId: job.id,
                rawData: r.rawData as object,
                name: r.name,
                address: r.address,
                lat: 'lat' in r ? (r.lat as number) : null,
                lng: 'lng' in r ? (r.lng as number) : null,
                phone: r.phone ?? null,
              },
            })
          )
        )

        await prisma.crawlJob.update({
          where: { id: job.id },
          data: { status: 'DONE', resultCount: items.length },
        })

        results.success++
        results.total += items.length
      } catch {
        results.failed++
      }
    }
  }

  return NextResponse.json({ data: results })
}
