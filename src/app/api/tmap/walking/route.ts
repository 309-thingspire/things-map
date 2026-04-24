import { NextRequest, NextResponse } from 'next/server'
import { OFFICE } from '@/lib/office'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const goalLat = searchParams.get('goalLat')
  const goalLng = searchParams.get('goalLng')

  if (!goalLat || !goalLng) {
    return NextResponse.json({ error: '목적지 좌표가 필요합니다.' }, { status: 400 })
  }

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
          startX: String(OFFICE.lng),
          startY: String(OFFICE.lat),
          endX: goalLng,
          endY: goalLat,
          startName: '본사',
          endName: '목적지',
          searchOption: '0',
          reqCoordType: 'WGS84GEO',
          resCoordType: 'WGS84GEO',
        }),
        next: { revalidate: 86400 }, // 1일 캐시
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
