import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function run() {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, select: { name: true, approvalCode: true, role: true } })
  users.forEach(u => console.log(`${u.name}\t${u.approvalCode}${u.role === 'ADMIN' ? '\t(관리자)' : ''}`))
  await prisma.$disconnect()
}
run()
