import { prisma } from '@/lib/prisma'

interface CrawlData {
  name: string
  phone?: string | null
  businessHours?: string | null
  tags?: string[]
  menus?: { name: string; price: number | null }[]
}

/** 크롤 결과를 기반으로 기존 매장을 찾아 자동 업데이트하고 staging 상태를 결정 */
export async function autoApproveStaging(
  stagingId: string,
  keyword: string,
  data: CrawlData,
): Promise<'APPROVED' | 'UNREGISTERED' | 'REJECTED'> {
  try {
    const norm = (s: string) => s.replace(/\s/g, '').toLowerCase()
    const nk = norm(keyword)
    const nd = norm(data.name)

    // 1. 정확한 이름 일치 (대소문자 무시) — data.name 기준
    let store = await prisma.store.findFirst({
      where: { name: { equals: data.name.trim(), mode: 'insensitive' } },
    })

    // 2. 키워드 정확 일치 (결과명과 키워드가 다를 수 있음)
    if (!store && keyword !== data.name) {
      store = await prisma.store.findFirst({
        where: { name: { equals: keyword.trim(), mode: 'insensitive' } },
      })
    }

    // 3. 부분 포함 검색 — 점수 기반으로 가장 잘 맞는 매장 선택
    if (!store) {
      const all = await prisma.store.findMany({ select: { id: true, name: true } })
      let best: { id: string; name: string; score: number } | null = null
      for (const s of all) {
        const ns = norm(s.name)
        let score = 0
        if (ns === nk || ns === nd) score = 100           // 정규화 후 일치
        else if (nk.includes(ns) && ns.length >= 2) score = 80   // 키워드에 DB명 포함
        else if (ns.includes(nk) && nk.length >= 2) score = 70   // DB명에 키워드 포함
        else if (nd.includes(ns) && ns.length >= 2) score = 60   // 결과명에 DB명 포함
        else if (ns.includes(nd) && nd.length >= 2) score = 50   // DB명에 결과명 포함
        if (score > 0 && (!best || score > best.score)) {
          best = { id: s.id, name: s.name, score }
        }
      }
      if (best) {
        store = await prisma.store.findUnique({ where: { id: best.id } })
      }
    }

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

    // 배열 트랜잭션 사용 (Neon 트랜잭션 모드 풀링 호환 — interactive 트랜잭션 미지원)
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
