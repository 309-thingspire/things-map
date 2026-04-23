import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calcOfficeDistance } from '@/lib/office'
import { sanitizeAddress } from '@/lib/sanitizeAddress'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') ?? '37.5285')
    const lng = parseFloat(searchParams.get('lng') ?? '126.9640')
    const radiusParam = searchParams.get('radius')
    const radius = radiusParam ? parseInt(radiusParam) : null  // null이면 전체 반환
    const categoriesParam = searchParams.get('categories')
    const category = searchParams.get('category')
    const theme = searchParams.get('theme')
    const minRating = parseFloat(searchParams.get('minRating') ?? '0')
    const sort = searchParams.get('sort') ?? 'distance'
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '200')

    const where: Record<string, unknown> = { status: 'ACTIVE' }

    // 카테고리 다중 선택 (__none__ = 미분류, __featured__ = 맛집)
    if (categoriesParam) {
      const ids = categoriesParam.split(',').filter(Boolean)
      const hasNone = ids.includes('__none__')
      const hasFeatured = ids.includes('__featured__')
      const realIds = ids.filter((id) => id !== '__none__' && id !== '__featured__')
      const conditions: Record<string, unknown>[] = []
      if (realIds.length > 0) conditions.push({ categoryId: { in: realIds } })
      if (hasNone) conditions.push({ categoryId: null })
      if (hasFeatured) conditions.push({ favoriteCount: { gte: 5 } })
      if (conditions.length === 1) Object.assign(where, conditions[0])
      else if (conditions.length > 1) where.OR = conditions
    } else if (category) {
      where.categoryId = category
    }

    if (theme) where.themeTags = { has: theme }
    if (minRating > 0) {
      where.internalRating = { avgTotal: { gte: minRating } }
    }

    const stores = await prisma.store.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        internalRating: { select: { avgTotal: true, reviewCount: true } },
      },
    })

    type StoreWithDist = typeof stores[number] & { distance: number }

    function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
      const R = 6371000
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLng = ((lng2 - lng1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    const withDistance: StoreWithDist[] = stores
      .map((s) => ({ ...s, distance: calcDistance(lat, lng, s.lat, s.lng) }))
      .filter((s) => radius === null || s.distance <= radius)

    if (sort === 'distance') {
      withDistance.sort((a, b) => a.distance - b.distance)
    } else if (sort === 'rating') {
      withDistance.sort((a, b) => (b.internalRating?.avgTotal ?? 0) - (a.internalRating?.avgTotal ?? 0))
    } else if (sort === 'latest') {
      withDistance.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    const total = withDistance.length
    const paginated = withDistance.slice((page - 1) * limit, page * limit)

    return NextResponse.json({ data: { stores: paginated, total, page } })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, lat, lng, phone, businessHours, categoryId, themeTags, naverUrl, kakaoUrl, googleUrl, menus } = body

    if (!name || !address || lat == null || lng == null) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    const cleanAddress = sanitizeAddress(address)
    const { officeDistanceM, walkingMinutes } = calcOfficeDistance(parseFloat(lat), parseFloat(lng))
    const resolvedNaverUrl = naverUrl || `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${cleanAddress}`)}`

    const store = await prisma.store.create({
      data: {
        name,
        address: cleanAddress,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        phone: phone ?? null,
        businessHours: businessHours ?? null,
        categoryId: categoryId ?? null,
        themeTags: themeTags ?? [],
        naverUrl: resolvedNaverUrl,
        kakaoUrl: kakaoUrl ?? null,
        googleUrl: googleUrl ?? null,
        officeDistanceM,
        walkingMinutes,
        menus: menus?.length
          ? { create: menus.map((m: { name: string; price?: number; isRepresentative?: boolean }) => ({ name: m.name, price: m.price ?? null, isRepresentative: m.isRepresentative ?? false })) }
          : undefined,
      },
      include: { category: true, menus: true },
    })

    return NextResponse.json({ data: store }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
