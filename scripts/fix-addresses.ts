import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Targeted fixes for addresses that weren't handled correctly by the auto-sanitizer
const fixes: Record<string, string> = {
  '챕터 남영': '서울특별시 용산구 한강대로76길 11-27',
  '뼈탄집 용산직영점': '서울특별시 용산구 백범로99길 62',
  '언뎁트': '서울특별시 용산구 두텁바위로13길 11',
  '비비드커피 서울역': '서울특별시 용산구 한강대로 372',
  '한촌설렁탕 용산아이파크몰점': '서울특별시 용산구 한강대로23길 55',
  '골드버튼커피': '서울특별시 용산구 한강대로80길 5',
}

async function main() {
  // Also print current state of edge cases for manual review
  const edgeCases = await prisma.store.findMany({
    where: { name: { in: [...Object.keys(fixes), '비비드커피 서울역', '골드버튼커피', '한촌설렁탕 용산아이파크몰점'] } },
    select: { name: true, address: true },
  })
  console.log('\n현재 상태:')
  edgeCases.forEach(s => console.log(`  ${s.name}: "${s.address}"`))

  for (const [name, address] of Object.entries(fixes)) {
    const store = await prisma.store.findFirst({ where: { name } })
    if (store) {
      await prisma.store.update({ where: { id: store.id }, data: { address } })
      console.log(`\n✓ 수정: ${name} → "${address}"`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
