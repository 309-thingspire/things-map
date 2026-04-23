import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function sanitizeAddress(address: string): string {
  let clean = address
  clean = clean.replace(/\s+(?:지하\s*\d*층?|\d+(?:(?:[-~]|,\s*)\d+)*층|B\d*층?)[^\n]*/i, '')
  clean = clean.replace(/\s+(?:[가-힣A-Za-z0-9]*)?(?:빌딩|타워|건물|센터|플라자|프라자|몰|하우스|별관|상가)(?:\s[^\n]*)?$/i, '')
  clean = clean.replace(/\s+\([^)]*\)\s*$/, '')
  clean = clean.replace(/[,.\s]+$/, '')
  return clean.trim()
}

async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, name: true, address: true } })
  let updated = 0

  for (const store of stores) {
    const clean = sanitizeAddress(store.address)
    if (clean !== store.address) {
      await prisma.store.update({
        where: { id: store.id },
        data: { address: clean },
      })
      console.log(`✓ ${store.name}: "${store.address}" → "${clean}"`)
      updated++
    }
  }

  console.log(`\n${updated}개 매장 주소 정리 완료 (총 ${stores.length}개 중)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
