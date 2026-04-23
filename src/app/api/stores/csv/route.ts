import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { searchNaver } from '@/lib/crawl/naver'
import { calcOfficeDistance } from '@/lib/office'
import { findDuplicateStore } from '@/lib/checkDuplicate'

const CSV_HEADERS = ['name', 'address', 'lat', 'lng', 'phone', 'category', 'themeTags', 'businessHours', 'naverUrl', 'walkingMinutes']

// GET: 전체 매장 CSV 다운로드
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stores = await prisma.store.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })

    const rows = stores.map((s) => [
      s.name,
      s.address,
      s.lat,
      s.lng,
      s.phone ?? '',
      s.category?.name ?? '',
      s.themeTags.join('|'),
      s.businessHours ?? '',
      s.naverUrl ?? '',
      s.walkingMinutes ?? '',
    ])

    const csv = [CSV_HEADERS.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')

    return new NextResponse('\uFEFF' + csv, { // BOM for Excel Korean encoding
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stores_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: CSV 가져오기 (매장명만 있으면 Naver로 자동 채우기)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const text = await request.text()
    const lines = text.split('\n').filter(Boolean)
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV 데이터가 없습니다.' }, { status: 400 })
    }

    const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
    const nameIdx = header.indexOf('name')
    const addressIdx = header.indexOf('address')
    const latIdx = header.indexOf('lat')
    const lngIdx = header.indexOf('lng')
    const phoneIdx = header.indexOf('phone')
    const categoryIdx = header.indexOf('category')
    const themeTagsIdx = header.indexOf('themetags')
    const businessHoursIdx = header.indexOf('businesshours')
    const naverUrlIdx = header.indexOf('naverurl')

    if (nameIdx === -1) {
      return NextResponse.json({ error: 'name 컬럼이 필요합니다.' }, { status: 400 })
    }

    const results: { success: string[]; failed: string[] } = { success: [], failed: [] }

    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line)
      const name = cols[nameIdx]?.trim()
      if (!name) continue

      try {
        let address = cols[addressIdx]?.trim() ?? ''
        let lat = parseFloat(cols[latIdx] ?? '')
        let lng = parseFloat(cols[lngIdx] ?? '')
        let phone: string | null = cols[phoneIdx]?.trim() || null
        let naverUrl: string | null = cols[naverUrlIdx]?.trim() || null
        const themeTags = cols[themeTagsIdx]?.trim() ? cols[themeTagsIdx].split('|').map((t) => t.trim()).filter(Boolean) : []
        const businessHours = cols[businessHoursIdx]?.trim() ?? null

        // 주소나 좌표가 없으면 Naver 검색으로 자동 채우기
        if (!address || isNaN(lat) || isNaN(lng)) {
          const naverResults = await searchNaver(name, 1, 1)
          if (naverResults.length > 0) {
            const r = naverResults[0]
            address = address || r.address
            lat = isNaN(lat) ? r.lat : lat
            lng = isNaN(lng) ? r.lng : lng
            phone = phone || r.phone
            naverUrl = naverUrl || r.naverUrl
          }
        }

        if (!address || isNaN(lat) || isNaN(lng)) {
          results.failed.push(`${name} (주소/좌표 없음)`)
          continue
        }

        // 카테고리 매핑
        let categoryId: string | null = null
        const categoryName = cols[categoryIdx]?.trim()
        if (categoryName) {
          const cat = await prisma.category.findFirst({ where: { name: { contains: categoryName } } })
          categoryId = cat?.id ?? null
        }

        const dup = await findDuplicateStore(name)
        if (dup) {
          results.failed.push(`${name} (중복: 이미 등록됨)`)
          continue
        }

        const { officeDistanceM, walkingMinutes } = calcOfficeDistance(lat, lng)

        await prisma.store.create({
          data: {
            name,
            address,
            lat,
            lng,
            phone: phone || null,
            businessHours,
            categoryId,
            themeTags,
            naverUrl,
            officeDistanceM,
            walkingMinutes,
          },
        })

        results.success.push(name)
      } catch {
        results.failed.push(name)
      }
    }

    return NextResponse.json({ data: results })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
