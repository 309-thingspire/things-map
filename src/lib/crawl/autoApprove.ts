import { prisma } from '@/lib/prisma'
import { sanitizeAddress } from '@/lib/sanitizeAddress'

interface CrawlData {
  name: string
  address?: string | null  // 크롤된 원본 주소 (상세주소 포함)
  phone?: string | null
  businessHours?: string | null
  tags?: string[]
  menus?: { name: string; price: number | null }[]
}

/** 주소 정규화: "서울특별시" ↔ "서울" 차이, 공백 등 흡수 */
function normAddr(raw: string): string {
  return sanitizeAddress(raw)
    .replace(/특별시|광역시|특별자치[시도]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** 크롤 결과를 기반으로 기존 매장을 찾아 자동 업데이트하고 staging 상태를 결정 */
export async function autoApproveStaging(
  stagingId: string,
  keyword: string,
  data: CrawlData,
): Promise<'APPROVED' | 'UNREGISTERED' | 'REJECTED'> {
  try {
    let store: { id: string } | null = null

    // 1. 주소 기반 매칭 (가장 신뢰도 높음)
    if (data.address) {
      const crawledAddr = normAddr(data.address)
      if (crawledAddr.length >= 5) {
        const all = await prisma.store.findMany({ select: { id: true, address: true } })
        const matched = all.find((s) => {
          const dbAddr = normAddr(s.address)
          // DB 주소와 크롤 주소의 앞부분이 일치 (번지까지)
          return dbAddr === crawledAddr || dbAddr.startsWith(crawledAddr) || crawledAddr.startsWith(dbAddr)
        })
        if (matched) store = matched
      }
    }

    // 2. 이름 완전 일치 fallback (주소 매칭 실패 시)
    if (!store) {
      store = await prisma.store.findFirst({
        where: { name: { equals: data.name.trim(), mode: 'insensitive' } },
        select: { id: true },
      })
    }

    // 3. 키워드 완전 일치 fallback
    if (!store && keyword !== data.name) {
      store = await prisma.store.findFirst({
        where: { name: { equals: keyword.trim(), mode: 'insensitive' } },
        select: { id: true },
      })
    }

    // 4. 이름 부분 포함 fallback (점수 기반 최선 매칭)
    if (!store) {
      const norm = (s: string) => s.replace(/\s/g, '').toLowerCase()
      const nk = norm(keyword)
      const nd = norm(data.name)
      const all = await prisma.store.findMany({ select: { id: true, name: true } })
      let best: { id: string; score: number } | null = null
      for (const s of all) {
        const ns = norm(s.name)
        let score = 0
        if (ns === nk || ns === nd) score = 100
        else if (nk.includes(ns) && ns.length >= 2) score = 80
        else if (ns.includes(nk) && nk.length >= 2) score = 70
        else if (nd.includes(ns) && ns.length >= 2) score = 60
        else if (ns.includes(nd) && nd.length >= 2) score = 50
        if (score > 0 && (!best || score > best.score)) best = { id: s.id, score }
      }
      if (best) store = best
    }

    // 매칭 실패 → 미등록 (크롤 성공이지만 DB에 없는 매장)
    if (!store) {
      await prisma.stagingStore.update({
        where: { id: stagingId },
        data: { status: 'UNREGISTERED' },
      })
      return 'UNREGISTERED'
    }

    const storeId = store.id

    const storeUpdate = prisma.store.update({
      where: { id: storeId },
      data: {
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.businessHours ? { businessHours: data.businessHours } : {}),
        ...(data.tags?.length ? { themeTags: data.tags } : {}),
        lastCrawledAt: new Date(),
      },
    })

    const stagingUpdate = prisma.stagingStore.update({
      where: { id: stagingId },
      data: { status: 'APPROVED' },
    })

    // 배열 트랜잭션: Neon 트랜잭션 모드 풀링 호환 (interactive 트랜잭션 미지원)
    if (data.menus && data.menus.length > 0) {
      await prisma.$transaction([
        prisma.menu.deleteMany({ where: { storeId } }),
        prisma.menu.createMany({
          data: data.menus.map((m) => ({
            storeId,
            name: m.name,
            price: m.price != null ? Math.round(m.price) : null,
            isRepresentative: false,
          })),
        }),
        storeUpdate,
        stagingUpdate,
      ])
    } else {
      await prisma.$transaction([storeUpdate, stagingUpdate])
    }

    return 'APPROVED'
  } catch {
    await prisma.stagingStore
      .update({ where: { id: stagingId }, data: { status: 'REJECTED' } })
      .catch(() => {})
    return 'REJECTED'
  }
}
