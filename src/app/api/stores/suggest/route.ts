import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { searchNaver } from '@/lib/crawl/naver'
import { calcOfficeDistance } from '@/lib/office'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ data: { results: [] } })

  try {
    const raw = await searchNaver(q, 1, 5)
    const results = raw
      .map((r) => ({
        name: r.name,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        phone: r.phone,
        category: r.category,
        naverUrl: r.naverUrl,
        ...calcOfficeDistance(r.lat, r.lng),
      }))
      .sort((a, b) => a.officeDistanceM - b.officeDistanceM)

    return NextResponse.json({ data: { results } })
  } catch {
    return NextResponse.json({ error: '검색 실패' }, { status: 500 })
  }
}
