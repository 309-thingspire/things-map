interface NaverItem {
  title: string
  address: string
  roadAddress: string
  telephone: string
  category: string
  mapx: string // 경도 * 1e7 (KATECH)
  mapy: string // 위도 * 1e7
  link: string
}

interface NaverResult {
  name: string
  address: string
  lat: number
  lng: number
  phone: string | null
  category: string | null
  naverUrl: string
  rawData: NaverItem
}

// KATECH 좌표 → WGS84 근사 변환
function katechToWgs84(katechX: number, katechY: number): { lat: number; lng: number } {
  // 네이버 local API는 KATECH 좌표계(단위 1e7)로 반환
  const lng = katechX / 1e7
  const lat = katechY / 1e7
  return { lat, lng }
}

export async function searchNaver(keyword: string, start = 1, display = 5): Promise<NaverResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not set')

  const params = new URLSearchParams({ query: keyword, display: String(display), start: String(start), sort: 'comment' })

  const res = await fetch(`https://openapi.naver.com/v1/search/local.json?${params}`, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!res.ok) throw new Error(`Naver API error: ${res.status}`)

  const json = await res.json()
  const items: NaverItem[] = json.items ?? []

  return items.map((item) => {
    const { lat, lng } = katechToWgs84(parseInt(item.mapx), parseInt(item.mapy))
    return {
      name: item.title.replace(/<[^>]+>/g, ''), // HTML 태그 제거
      address: item.roadAddress || item.address,
      lat,
      lng,
      phone: item.telephone || null,
      category: item.category || null,
      naverUrl: item.link || '',
      rawData: item,
    }
  })
}
