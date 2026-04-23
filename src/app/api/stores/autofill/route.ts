import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { searchNaver } from '@/lib/crawl/naver'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name) return NextResponse.json({ error: '매장명을 입력해주세요.' }, { status: 400 })

    const results = await searchNaver(name, 1, 1)
    if (!results.length) {
      return NextResponse.json({ error: '검색 결과가 없습니다.' }, { status: 404 })
    }

    const r = results[0]
    return NextResponse.json({
      data: {
        name: r.name,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        phone: r.phone,
        category: r.category,
        naverUrl: r.naverUrl,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '자동 채우기에 실패했습니다.' }, { status: 500 })
  }
}
