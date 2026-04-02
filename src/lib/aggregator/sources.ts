/**
 * News Sources — RSS + Reddit parsers for esports content.
 * 
 * Each source returns a normalized RawArticle[] that can be
 * deduplicated and processed downstream.
 */

import Parser from "rss-parser"

// ─── Types ──────────────────────────────────────────────────────────
export interface RawArticle {
  externalId: string       // unique key for dedup
  title: string
  summary: string          // short description / first paragraph
  sourceUrl: string
  imageUrl: string | null
  sourceName: string       // e.g. "HLTV", "Reddit"
  category: string         // mapped to our internal category slugs
  publishedAt: Date
}

// ─── Category mapping ───────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cs2:      ["cs2", "counter-strike", "csgo", "cs:go", "counter strike", "hltv", "blast", "esl", "iem", "major"],
  dota2:    ["dota", "dota2", "dota 2", "the international", "ti1", "dpc", "roshan"],
  valorant: ["valorant", "vct", "riot games valorant", "champions tour"],
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return slug
    }
  }
  return "cs2" // default fallback
}

// ─── RSS Feeds ──────────────────────────────────────────────────────
interface FeedSource {
  name: string
  url: string
  defaultCategory?: string
}

const RSS_FEEDS: FeedSource[] = [
  {
    name: "HLTV",
    url: "https://www.hltv.org/rss/news",
    defaultCategory: "cs2",
  },
  {
    name: "Dexerto Esports",
    url: "https://www.dexerto.com/feed/esports",
  },
  {
    name: "EsportsHeadlines",
    url: "https://esportsheadlines.com/feed/",
  },
  {
    name: "DotEsports",
    url: "https://dotesports.com/feed",
  },
  {
    name: "TheSpike.gg",
    url: "https://www.thespike.gg/rss",
    defaultCategory: "valorant",
  },
]

const rssParser = new Parser({
  timeout: 10_000,
  headers: {
    "User-Agent": "o.esports-aggregator/1.0",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
})

export async function fetchRSSFeeds(): Promise<RawArticle[]> {
  const results: RawArticle[] = []

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url)
      const items = (parsed.items || []).slice(0, 10) // take latest 10

      for (const item of items) {
        if (!item.title || !item.link) continue

        // Extract image from content/media
        let imageUrl: string | null = null
        const mediaContent = item.enclosure?.url
          || extractImageFromHtml(item["content:encoded"] || item.content || "")
        if (mediaContent) imageUrl = mediaContent

        const summary = stripHtml(
          item.contentSnippet || item.content || item.summary || ""
        ).slice(0, 500)

        results.push({
          externalId: `rss:${feed.name}:${item.guid || item.link}`,
          title: cleanText(item.title),
          summary,
          sourceUrl: item.link,
          imageUrl,
          sourceName: feed.name,
          category: feed.defaultCategory || detectCategory(item.title + " " + summary),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        })
      }

      console.log(`[Aggregator] ✓ ${feed.name}: ${items.length} items fetched`)
    } catch (err) {
      console.error(`[Aggregator] ✗ ${feed.name} RSS failed:`, (err as Error).message)
    }
  }

  return results
}

// ─── Reddit API ─────────────────────────────────────────────────────
const REDDIT_SUBREDDITS = ["esports", "GlobalOffensive", "DotA2", "VALORANT"]

export async function fetchRedditPosts(): Promise<RawArticle[]> {
  const results: RawArticle[] = []

  for (const subreddit of REDDIT_SUBREDDITS) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=8`,
        {
          headers: {
            "User-Agent": "o.esports-aggregator/1.0 (news bot)",
          },
          signal: AbortSignal.timeout(10_000),
        }
      )

      if (!res.ok) {
        console.error(`[Aggregator] ✗ Reddit r/${subreddit}: HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      const posts = data?.data?.children || []

      for (const post of posts) {
        const d = post.data
        if (!d || d.stickied || d.is_self === false && !d.selftext) {
          // Skip stickied and link-only posts with no text
        }

        // Filter: only posts with decent engagement
        if ((d.score || 0) < 50) continue
        if (!d.title) continue

        // Detect category from subreddit
        let category = "cs2"
        if (subreddit.toLowerCase().includes("dota")) category = "dota2"
        else if (subreddit.toLowerCase().includes("valorant")) category = "valorant"
        else category = detectCategory(d.title + " " + (d.selftext || ""))

        const imageUrl = d.thumbnail && d.thumbnail.startsWith("http")
          ? d.thumbnail
          : d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&") || null

        results.push({
          externalId: `reddit:${d.id}`,
          title: cleanText(d.title),
          summary: (d.selftext || d.title).slice(0, 500),
          sourceUrl: `https://reddit.com${d.permalink}`,
          imageUrl,
          sourceName: `Reddit r/${subreddit}`,
          category,
          publishedAt: new Date((d.created_utc || Date.now() / 1000) * 1000),
        })
      }

      console.log(`[Aggregator] ✓ Reddit r/${subreddit}: ${posts.length} posts`)
    } catch (err) {
      console.error(`[Aggregator] ✗ Reddit r/${subreddit} failed:`, (err as Error).message)
    }
  }

  return results
}

// ─── All sources combined ───────────────────────────────────────────
export async function fetchAllSources(): Promise<RawArticle[]> {
  const [rss, reddit] = await Promise.allSettled([
    fetchRSSFeeds(),
    fetchRedditPosts(),
  ])

  const articles: RawArticle[] = []

  if (rss.status === "fulfilled") articles.push(...rss.value)
  if (reddit.status === "fulfilled") articles.push(...reddit.value)

  console.log(`[Aggregator] Total raw articles fetched: ${articles.length}`)
  return articles
}

// ─── Utils ──────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim()
}

function extractImageFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] || null
}
