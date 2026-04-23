import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const stores = await prisma.store.findMany({ select: { id: true, name: true, address: true } })
  console.log(`${stores.length}개 매장 naverUrl 업데이트 시작`)

  for (const store of stores) {
    const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${store.name} ${store.address}`)}`
    await prisma.store.update({ where: { id: store.id }, data: { naverUrl } })
    console.log(`✅ ${store.name}`)
  }

  console.log('완료')
  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
