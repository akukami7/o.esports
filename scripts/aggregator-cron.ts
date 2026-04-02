#!/usr/bin/env tsx
/**
 * Standalone aggregator cron runner.
 * 
 * Usage:
 *   npx tsx scripts/aggregator-cron.ts
 * 
 * This runs the aggregator every 3 minutes using node-cron.
 * Can also be triggered once with: ONCE=1 npx tsx scripts/aggregator-cron.ts
 */

import "dotenv/config"
import cron from "node-cron"
import { PrismaClient } from "@prisma/client"

// ─── Bootstrap (standalone, not inside Next.js) ─────────────────────
// We need to set up globals that the aggregator modules expect

const prisma = new PrismaClient()

// Set up global prisma for @/lib/prisma
declare const globalThis: {
  prismaGlobal: PrismaClient | undefined
} & typeof global

globalThis.prismaGlobal = prisma


// ─── Dynamic import to work with path aliases ──────────────────────
async function run() {
  // Import the processor directly using relative paths
  // since tsx doesn't resolve @/ aliases by default
  const { fetchAllSources } = await import("../src/lib/aggregator/sources")
  const { generateArticle, generateSlug } = await import("../src/lib/aggregator/ai")

  const MAX_NEW_PER_RUN = Number(process.env.AGGREGATOR_MAX_PER_RUN || "5")
  const MIN_TITLE_LENGTH = 15
  const SPAM_KEYWORDS = [
    "giveaway", "free skins", "betting", "gambling", "casino",
    "click here", "subscribe", "follow me",
    "[ad]", "[sponsored]", "buy now",
  ]

  console.log("\n" + "═".repeat(60))
  console.log("[Aggregator CRON] 🚀 Starting aggregation run...")
  console.log("[Aggregator CRON] Time:", new Date().toISOString())
  console.log("═".repeat(60))

  const startTime = Date.now()
  let saved = 0
  let errors = 0

  try {
    // 1. Fetch
    const rawArticles = await fetchAllSources()
    console.log(`[Aggregator CRON] Raw articles: ${rawArticles.length}`)

    // 2. Filter
    const cleaned = rawArticles.filter((article) => {
      if (article.title.length < MIN_TITLE_LENGTH) return false
      const lower = (article.title + " " + article.summary).toLowerCase()
      if (SPAM_KEYWORDS.some((kw) => lower.includes(kw))) return false
      const age = Date.now() - article.publishedAt.getTime()
      if (age > 24 * 60 * 60 * 1000) return false
      return true
    })

    // 3. Dedup
    const categories = await prisma.category.findMany()
    const categoryMap = new Map(categories.map((c) => [c.slug, c.id]))

    const recentNews = await prisma.news.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
      select: { title_ru: true, title_en: true, slug: true },
    })

    const existingSlugs = new Set(recentNews.map((n) => n.slug))
    const titlesList: string[] = recentNews.flatMap((n) => [
      n.title_ru?.toLowerCase(),
      n.title_en?.toLowerCase(),
    ].filter((t): t is string => !!t))
    const existingTitles = new Set(titlesList)

    const unique = cleaned.filter((article) => {
      const potentialSlug = generateSlug(article.title)
      if (existingSlugs.has(potentialSlug)) return false
      const lowerTitle = article.title.toLowerCase()
      const titlesArray = Array.from(existingTitles)
      for (const existing of titlesArray) {
        if (existing && jaccard(lowerTitle, existing) > 0.7) return false
      }
      return true
    })

    console.log(`[Aggregator CRON] After dedup: ${unique.length} unique (${cleaned.length - unique.length} duplicates)`)

    // 4. Process through AI
    const toProcess = unique.slice(0, MAX_NEW_PER_RUN)

    for (const article of toProcess) {
      try {
        const categoryId = categoryMap.get(article.category) || categoryMap.get("cs2")
        if (!categoryId) {
          console.error("[Aggregator CRON] No categories in DB!")
          errors++
          continue
        }

        const generated = await generateArticle(
          article.title,
          article.summary,
          article.sourceName,
          article.category
        )

        if (!generated) { errors++; continue }

        let slug = generateSlug(generated.title_en)
        const existingSlug = await prisma.news.findUnique({ where: { slug } })
        if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`

        await prisma.news.create({
          data: {
            title_ru: generated.title_ru,
            title_en: generated.title_en,
            title_kz: generated.title_kz,
            content_ru: generated.content_ru,
            content_en: generated.content_en,
            content_kz: generated.content_kz,
            slug,
            imageUrl: article.imageUrl,
            authorId: "Aggregator",
            categoryId,
          },
        })

        saved++
        existingSlugs.add(slug)
        existingTitles.add(generated.title_en.toLowerCase())

        console.log(`[Aggregator CRON] ✓ Saved: "${generated.title_en}"`)
        await new Promise((r) => setTimeout(r, 1000))
      } catch (err) {
        console.error(`[Aggregator CRON] ✗ Failed:`, (err as Error).message)
        errors++
      }
    }
  } catch (err) {
    console.error("[Aggregator CRON] Fatal error:", err)
    errors++
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n[Aggregator CRON] 📊 Done: ${saved} saved, ${errors} errors, ${duration}s`)
  console.log("─".repeat(60) + "\n")
}

// ─── Jaccard similarity ─────────────────────────────────────────────
function jaccard(a: string, b: string): number {
  const wordsA = a.split(/\s+/)
  const setB = new Set(b.split(/\s+/))
  let intersection = 0
  for (const word of wordsA) {
    if (setB.has(word)) intersection++
  }
  const union = wordsA.length + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ─── Entry ──────────────────────────────────────────────────────────
const isOnce = process.env.ONCE === "1"

if (isOnce) {
  console.log("[Aggregator CRON] Running once...")
  run()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
} else {
  const schedule = process.env.AGGREGATOR_CRON || "*/3 * * * *"
  console.log(`[Aggregator CRON] Scheduling: "${schedule}"`)
  console.log("[Aggregator CRON] Press Ctrl+C to stop\n")

  // Run immediately on start
  run().catch(console.error)

  // Then schedule
  cron.schedule(schedule, () => {
    run().catch(console.error)
  })
}
