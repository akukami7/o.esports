import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  // Clear existing
  await prisma.banner.deleteMany()
  await prisma.news.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // Create admin user
  await prisma.user.create({
    data: {
      email: 'admin@o.esports',
      password: 'password',
      name: 'Admin',
      role: 'ADMIN',
    },
  })

  // Create categories
  const cs2 = await prisma.category.create({
    data: {
      name: 'CS2',
      slug: 'cs2',
    },
  })

  const dota2 = await prisma.category.create({
    data: {
      name: 'Dota 2',
      slug: 'dota2',
    },
  })

  const valorant = await prisma.category.create({
    data: {
      name: 'Valorant',
      slug: 'valorant',
    },
  })

  // Новостей больше нет в сидах. Все новости будут поступать ИСКЛЮЧИТЕЛЬНО из настоящего парсера!

  // Create Banners
  await prisma.banner.create({
    data: {
      name: 'Razer Keyboard Promo',
      imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=2071&auto=format&fit=crop',
      targetUrl: 'https://razer.com/?utm_source=oesports',
      position: 'SIDEBAR',
      isActive: true,
    }
  })

  await prisma.banner.create({
    data: {
      name: 'Secretlab Chair Promo',
      imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=2070&auto=format&fit=crop',
      targetUrl: 'https://secretlab.co/?utm_source=oesports',
      position: 'IN_ARTICLE',
      isActive: true,
    }
  })

  await prisma.banner.create({
    data: {
      name: 'SteelSeries Headset Promo',
      imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1888&auto=format&fit=crop',
      targetUrl: 'https://steelseries.com/?utm_source=oesports',
      position: 'FEED',
      isActive: true,
    }
  })

  console.log('Database seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
