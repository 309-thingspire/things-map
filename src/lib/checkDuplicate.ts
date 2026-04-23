import { prisma } from '@/lib/prisma'

export async function findDuplicateStore(name: string, excludeId?: string) {
  return prisma.store.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      status: 'ACTIVE',
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, address: true },
  })
}
