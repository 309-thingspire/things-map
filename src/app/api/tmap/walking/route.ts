import { NextRequest, NextResponse } from 'next/server'
import { OFFICE } from '@/lib/office'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const goalLat = searchParams.get('goalLat')
  const goalLng = searchParams.get('goalLng')
  const startLatParam = searchParams.get('startLat')
  const startLngParam = searchParams.get('startLng')

  if (!goalLat || !goalLng) {
    return NextResponse.json({ error: '목적지 좌표가 필요합니다.' }, { status: 400 })
  }

  // 출발지: 파라미터가 있으면 사용, 없으면 본사
  const startLat = startLatParam ? parseFloat(startLatParam) : OFFICE.lat
  const startLng = startLngParam ? parseFloat(startLngParam) : OFFICE.lng
  const startName = startLatParam ? '내 위치' : '본사'

  const apiKey = process.env.TMAP_OPEN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'TMAP API 키가 설정되지 않았습니다.' }, { status: 500 })
  }

  try {
    const res = await fetch(
      'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json',
      {
        method: 'POST',
        headers: {
          appKey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startX: String(startLng),
          startY: String(startLat),
          endX: goalLng,
          endY: goalLat,
          startName,
          endName: '목적지',
          searchOption: '0',
          reqCoordType: 'WGS84GEO',
          resCoordType: 'WGS84GEO',
        }),
        // 출발지가 고정(본사)일 때만 캐시 적용
        ...(startLatParam ? {} : { next: { revalidate: 86400 } }),
      }
    )

    if (!res.ok) throw new Error(`TMAP ${res.status}`)

    const data = await res.json()
    const features = data?.features
    if (!features?.length) throw new Error('응답 파싱 실패')

    const props = features[0]?.properties
    const distanceM: number = props.totalDistance
    const walkingSeconds: number = props.totalTime
    const walkingMinutes = Math.ceil(walkingSeconds / 60)

    // Collect all LineString coordinates [lng, lat] → flatten into path
    const path: [number, number][] = features
      .filter((f: { geometry: { type: string } }) => f.geometry.type === 'LineString')
      .flatMap((f: { geometry: { coordinates: [number, number][] } }) => f.geometry.coordinates)

    return NextResponse.json({ distanceM, walkingMinutes, walkingSeconds, path })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
