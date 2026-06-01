import { PrismaClient, TaskType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  await prisma.taskCompletion.deleteMany()
  await prisma.weightEntry.deleteMany()
  await prisma.task.deleteMany()
  await prisma.userProfile.deleteMany()

  // ─── Ванюша ────────────────────────────────────────────────────────────
  const vanya = await prisma.userProfile.create({
    data: {
      slug: 'vanya',
      name: 'Ванюша',
      prizeTitle: 'билет на матч «Барселоны»',
      prizeEmoji: '⚽',
      colorScheme: 'blue',
    },
  })

  const vanyaTasks: Array<{
    title: string
    category: string
    type: TaskType
    targetCount?: number
    weekNumber?: number
    thresholdValue?: number
    order: number
  }> = [
    // Права
    { title: 'Попробовать сдать теорию', category: 'Права', type: 'ONE_TIME', order: 0 },
    { title: 'Попробовать сдать практику', category: 'Права', type: 'ONE_TIME', order: 1 },
    // Футбол
    { title: 'Футбольные тренировки', category: 'Футбол', type: 'COUNTER', targetCount: 2, order: 0 },
    // Стоматолог
    {
      title: 'Сходить к стоматологу и пролечить хотя бы один зубик',
      category: 'Стоматолог',
      type: 'ONE_TIME',
      order: 0,
    },
    // Тренировки по неделям
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 3, weekNumber: 1, order: 0 },
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 1, weekNumber: 2, order: 1 },
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 1, weekNumber: 3, order: 2 },
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 3, weekNumber: 4, order: 3 },
    // Гигиена
    { title: 'Помылся', category: 'Гигиена', type: 'DAILY', targetCount: 30, order: 0 },
  ]

  for (const t of vanyaTasks) {
    await prisma.task.create({ data: { userProfileId: vanya.id, ...t } })
  }

  // ─── Машуня ────────────────────────────────────────────────────────────
  const masha = await prisma.userProfile.create({
    data: {
      slug: 'masha',
      name: 'Машуня',
      prizeTitle: 'дайвинг в Египте',
      prizeEmoji: '🐠',
      colorScheme: 'rose',
    },
  })

  const mashaTasks: typeof vanyaTasks = [
    // Вес — чекпоинты
    { title: 'Меньше 63 кг', category: 'Вес', type: 'WEIGHT_CHECKPOINT', thresholdValue: 63, order: 0 },
    { title: 'Меньше 62.5 кг', category: 'Вес', type: 'WEIGHT_CHECKPOINT', thresholdValue: 62.5, order: 1 },
    { title: 'Меньше 62 кг', category: 'Вес', type: 'WEIGHT_CHECKPOINT', thresholdValue: 62, order: 2 },
    // Стартап
    { title: 'Задачка 1', category: 'Стартап', type: 'ONE_TIME', order: 0 },
    { title: 'Задачка 2', category: 'Стартап', type: 'ONE_TIME', order: 1 },
    // Тренировки по неделям
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 2, weekNumber: 1, order: 0 },
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 1, weekNumber: 2, order: 1 },
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 1, weekNumber: 3, order: 2 },
    { title: 'Тренировки', category: 'Тренировки', type: 'WEEKLY_COUNT', targetCount: 2, weekNumber: 4, order: 3 },
    // Гигиена
    { title: 'Почистила зубы', category: 'Гигиена', type: 'DAILY', targetCount: 30, order: 0 },
  ]

  for (const t of mashaTasks) {
    await prisma.task.create({ data: { userProfileId: masha.id, ...t } })
  }

  console.log('✅ Seed complete!')
  console.log(`   Ванюша id: ${vanya.id}`)
  console.log(`   Машуня id: ${masha.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
