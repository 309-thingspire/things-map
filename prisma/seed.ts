import { PrismaClient, Role } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient({ log: ['error'] })

async function main() {
  const approvalCode = randomUUID()

  const admin = await prisma.user.upsert({
    where: { approvalCode },
    update: {},
    create: {
      name: '관리자',
      team: '운영팀',
      approvalCode,
      role: Role.ADMIN,
      isActive: true,
    },
  })

  console.log('✅ 관리자 계정 생성 완료')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  이름: ${admin.name}`)
  console.log(`  승인코드: ${admin.approvalCode}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 기본 카테고리
  const categories = ['한식', '중식', '일식', '양식', '카페', '주점', '분식', '패스트푸드']
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log('✅ 기본 카테고리 생성 완료:', categories.join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
