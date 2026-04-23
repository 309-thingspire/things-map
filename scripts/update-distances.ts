import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { PrismaClient } from '@prisma/client'
import { calcOfficeDistance } from '../src/lib/office'

const prisma = new PrismaClient()

async function run() {
  const stores = await prisma.store.findMany({ select: { id: true, name: true, lat: true, lng: true } })
  console.log(`총 ${stores.length}개 매장 거리 재계산 시작`)

  for (const store of stores) {
    const { officeDistanceM, walkingMinutes } = calcOfficeDistance(store.lat, store.lng)
    await prisma.store.update({
      where: { id: store.id },
      data: { officeDistanceM, walkingMinutes },
    })
    console.log(`✅ ${store.name}: ${officeDistanceM}m / ${walkingMinutes}분`)
  }

  console.log('완료')
  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
