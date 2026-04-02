/**
 * News Processor — Main aggregation pipeline.
 * 
 * 1. Fetch from all sources
 * 2. Deduplicate against DB
 * 3. Generate articles via AI
 * 4. Save to Prisma
 * 5. Emit SSE events
 */

import prisma from "@/lib/prisma"
import { pusherServer } from "@/lib/pusher"
import { fetchAllSources, type RawArticle } from "./sources"
import { generateArticle, generateSlug } from "./ai"

// ─── Config ─────────────────────────────────────────────────────────
const MAX_NEW_PER_RUN = Number(process.env.AGGREGATOR_MAX_PER_RUN || "5")
const MIN_TITLE_LENGTH = 15
const SPAM_KEYWORDS = [
  "giveaway", "free skins", "betting", "gambling", "casino",
  "click here", "subscribe", "follow me", "onlyfans",
  "[ad]", "[sponsored]", "buy now",
]

// ─── Main Pipeline ──────────────────────────────────────────────────
export interface AggregatorResult {
  fetched: number
  filtered: number
  duplicates: number
  generated: number
  saved: number
  errors: number
  duration: number
}

export async function runAggregator(): Promise<AggregatorResult> {
  const startTime = Date.now()
  const result: AggregatorResult = {
    fetched: 0,
    filtered: 0,
    duplicates: 0,
    generated: 0,
    saved: 0,
    errors: 0,
    duration: 0,
  }

  console.log("\n" + "═".repeat(60))
  console.log("[Aggregator] 🚀 Starting aggregation run...")
  console.log("═".repeat(60))

  // ── Step 1: Fetch from all sources ──
  let rawArticles: RawArticle[]
  try {
    rawArticles = await fetchAllSources()
    result.fetched = rawArticles.length
  } catch (err) {
    console.error("[Aggregator] Fatal: Source fetch failed", err)
    result.errors++
    result.duration = Date.now() - startTime
    return result
  }

  if (rawArticles.length === 0) {
    console.log("[Aggregator] No articles found from any source")
    result.duration = Date.now() - startTime
    return result
  }

  // ── Step 2: Filter garbage ──
  const cleaned = rawArticles.filter((article) => {
    // Too short
    if (article.title.length < MIN_TITLE_LENGTH) return false

    // Spam filter
    const lowerTitle = article.title.toLowerCase()
    const lowerSummary = article.summary.toLowerCase()
    if (SPAM_KEYWORDS.some((kw) => lowerTitle.includes(kw) || lowerSummary.includes(kw))) {
      return false
    }

    // Too old (older than 24h)
    const age = Date.now() - article.publishedAt.getTime()
    if (age > 24 * 60 * 60 * 1000) return false

    return true
  })

  result.filtered = rawArticles.length - cleaned.length
  console.log(`[Aggregator] Filtered ${result.filtered} articles (spam/old/short)`)

  // ── Step 3: Deduplicate against DB ──
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map((c) => [c.slug, c.id]))

  // Get recent news titles for fuzzy dedup
  const recentNews = await prisma.news.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
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

    // Fuzzy title match — check if similar title already exists
    const lowerTitle = article.title.toLowerCase()
    const titlesArray = Array.from(existingTitles)
    for (const existing of titlesArray) {
      if (existing && similarity(lowerTitle, existing) > 0.7) return false
    }

    return true
  })

  result.duplicates = cleaned.length - unique.length
  console.log(`[Aggregator] Deduplicated: ${result.duplicates} duplicates removed`)

  // ── Step 4: Process top N articles through AI ──
  const toProcess = unique.slice(0, MAX_NEW_PER_RUN)
  console.log(`[Aggregator] Processing ${toProcess.length} articles through AI...`)

  for (const article of toProcess) {
    try {
      // Resolve category
      const categoryId = categoryMap.get(article.category)
      if (!categoryId) {
        console.warn(`[Aggregator] Unknown category '${article.category}', using cs2`)
      }
      const finalCategoryId = categoryId || categoryMap.get("cs2")
      if (!finalCategoryId) {
        console.error("[Aggregator] No categories in DB! Skipping.")
        result.errors++
        continue
      }

      // Generate AI content
      const generated = await generateArticle(
        article.title,
        article.summary,
        article.sourceName,
        article.category
      )

      if (!generated) {
        result.errors++
        continue
      }
      result.generated++

      // Generate unique slug
      let slug = generateSlug(generated.title_en)
      // Ensure uniqueness by checking DB
      const existingSlug = await prisma.news.findUnique({ where: { slug } })
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`
      }

      // ── Step 5: Save to DB ──
      const saved = await prisma.news.create({
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
          categoryId: finalCategoryId,
        },
        include: {
          category: true,
        },
      })

      result.saved++

      // ── Emit WebSockets event for live feed via Pusher ──
      await pusherServer.trigger("news-feed", "new_news", {
        ...saved,
        _liveAt: new Date().toISOString()
      })

      console.log(`[Aggregator] ✓ Saved: "${generated.title_en}" [${article.category}]`)

      // Add to existing sets to prevent duplicates within same run
      existingSlugs.add(slug)
      existingTitles.add(generated.title_en.toLowerCase())
      existingTitles.add(generated.title_ru.toLowerCase())

      // Rate limit: small delay between AI calls
      await sleep(1000)
    } catch (err) {
      console.error(`[Aggregator] ✗ Failed to process "${article.title}":`, (err as Error).message)
      result.errors++
    }
  }

  result.duration = Date.now() - startTime

  // ── Summary log ──
  console.log("\n" + "─".repeat(60))
  console.log("[Aggregator] 📊 Run complete:")
  console.log(`  Fetched:    ${result.fetched}`)
  console.log(`  Filtered:   ${result.filtered}`)
  console.log(`  Duplicates: ${result.duplicates}`)
  console.log(`  Generated:  ${result.generated}`)
  console.log(`  Saved:      ${result.saved}`)
  console.log(`  Errors:     ${result.errors}`)
  console.log(`  Duration:   ${(result.duration / 1000).toFixed(1)}s`)
  console.log("─".repeat(60) + "\n")

  return result
}

// ─── Utils ──────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Simple Jaccard-like similarity for title dedup */
function similarity(a: string, b: string): number {
  const wordsA = a.split(/\s+/)
  const setB = new Set(b.split(/\s+/))
  let intersection = 0
  for (const word of wordsA) {
    if (setB.has(word)) intersection++
  }
  const union = wordsA.length + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}
