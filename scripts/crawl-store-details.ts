/**
 * 카카오맵 크롤링으로 매장 상세정보(메뉴/가격/영업시간/전화번호) 수집
 *
 * 실행: npx tsx scripts/crawl-store-details.ts
 * 특정 매장만: npx tsx scripts/crawl-store-details.ts --name "윤선국밥"
 * 메뉴 없는 것만: npx tsx scripts/crawl-store-details.ts --missing
 * 강제 전체 갱신: npx tsx scripts/crawl-store-details.ts --force
 */
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { PrismaClient } from '@prisma/client'
import { crawlByStoreName } from '../src/lib/crawl/playwright'

const prisma = new PrismaClient()

async function run() {
  const args = process.argv.slice(2)
  const nameArg = args.includes('--name') ? args[args.indexOf('--name') + 1] : null
  const missingOnly = args.includes('--missing')
  const force = args.includes('--force')

  let stores
  if (nameArg) {
    stores = await prisma.store.findMany({ where: { name: { contains: nameArg } } })
  } else if (missingOnly) {
    stores = await prisma.store.findMany({ where: { menus: { none: {} } } })
  } else if (force) {
    stores = await prisma.store.findMany()
  } else {
    // 기본: 메뉴가 없는 매장만
    stores = await prisma.store.findMany({ where: { menus: { none: {} } } })
  }

  console.log(`\n크롤링 대상: ${stores.length}개 매장\n`)

  const results = { success: 0, failed: 0, skipped: 0 }

  for (const store of stores) {
    process.stdout.write(`⏳ ${store.name} ... `)

    try {
      const data = await crawlByStoreName(store.name)

      if (!data) {
        console.log('❌ 검색 결과 없음')
        results.failed++
        continue
      }

      // 메뉴 업데이트 (기존 삭제 후 재생성)
      if (data.menus.length > 0) {
        await prisma.menu.deleteMany({ where: { storeId: store.id } })
        await prisma.menu.createMany({
          data: data.menus.map((m, i) => ({
            storeId: store.id,
            name: m.name,
            price: m.price ?? null,
            isRepresentative: i === 0,
          })),
        })
      }

      // 영업시간/전화번호 — 기존 값이 없을 때만 덮어씀
      await prisma.store.update({
        where: { id: store.id },
        data: {
          businessHours: store.businessHours ?? data.businessHours ?? null,
          phone: store.phone ?? data.phone ?? null,
        },
      })

      const menuCount = data.menus.length
      console.log(`✅ 메뉴 ${menuCount}개${data.businessHours ? ' / 영업시간 ✓' : ''}${data.phone ? ' / 전화 ✓' : ''}`)
      results.success++
    } catch (e) {
      console.log(`❌ 오류: ${(e as Error).message}`)
      results.failed++
    }
  }

  console.log(`\n=== 완료 ===`)
  console.log(`✅ 성공: ${results.success}개`)
  console.log(`❌ 실패: ${results.failed}개`)
  console.log(`⏭  스킵: ${results.skipped}개`)

  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
