import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function run() {
  const total = await prisma.store.count()
  const withUrl = await prisma.store.count({ where: { naverUrl: { not: null } } })
  const empty = await prisma.store.count({ where: { OR: [{ naverUrl: null }, { naverUrl: '' }] } })
  console.log(`전체: ${total} / naverUrl 있음: ${withUrl} / 없음: ${empty}`)
  const samples = await prisma.store.findMany({ where: { naverUrl: { not: null } }, take: 3, select: { name: true, naverUrl: true } })
  samples.forEach(s => console.log(` - ${s.name} → ${s.naverUrl}`))
  await prisma.$disconnect()
}
run()
