import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const NAMES = [
  '강대윤','권용성','김경륜','김선경','김선민',
  '김영상','김준','김철','김희영','노진희',
  '박대신','박성희','박진우','변성은','송태근',
  '신봉조','원주연','이병하','이병훈','이정용',
  '이진호','이혜정','전소진','전인지','정용후',
  '조광재','조성진','최선하','허수영','홍기문',
]

function genCode() { return Math.floor(100000 + Math.random() * 900000).toString() }

async function run() {
  const results: { name: string; code: string; status: string }[] = []

  for (const name of NAMES) {
    const existing = await prisma.user.findFirst({ where: { name } })
    if (existing) {
      results.push({ name, code: existing.approvalCode, status: 'skip' })
    } else {
      const user = await prisma.user.create({
        data: { name, team: '띵스파이어', approvalCode: genCode(), role: 'USER' },
      })
      results.push({ name, code: user.approvalCode, status: 'new' })
    }
  }

  for (const r of results) {
    console.log(`${r.status}\t${r.name}\t${r.code}`)
  }

  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
