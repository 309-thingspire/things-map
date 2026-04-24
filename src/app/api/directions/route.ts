import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const startLat = searchParams.get('startLat')
  const startLng = searchParams.get('startLng')
  const goalLat = searchParams.get('goalLat')
  const goalLng = searchParams.get('goalLng')

  if (!startLat || !startLng || !goalLat || !goalLng) {
    return NextResponse.json({ error: '좌표가 필요합니다.' }, { status: 400 })
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${goalLng},${goalLat}?overview=full&geometries=geojson`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('OSRM 응답 오류')
    const data = await res.json()
    if (!data.routes?.length) return NextResponse.json({ error: '경로를 찾을 수 없습니다.' }, { status: 404 })

    const coords: [number, number][] = data.routes[0].geometry.coordinates
    return NextResponse.json({ path: coords })
  } catch {
    return NextResponse.json({ error: '경로 조회 실패' }, { status: 500 })
  }
}
