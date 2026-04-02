"use client"
import * as React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { Eye, Radio, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { AdSense } from "@/components/adsense"
import { BannerAd } from "@/components/banner-ad"
import { useTranslations } from "next-intl"

// ─── Types ──────────────────────────────────────────────────────────
type LocalizedNewsItem = {
  id: string
  title: string
  slug: string
  imageUrl: string | null
  createdAt: Date | string
  views: number
  category: { name: string }
  _liveAt?: string        // timestamp when item arrived via live feed
}

type RawNewsItem = {
  id: string
  title_ru: string
  title_en?: string | null
  title_kz?: string | null
  slug: string
  imageUrl: string | null
  createdAt: string
  views: number
  category: { name: string }
  _liveAt?: string
}

// ─── Constants ──────────────────────────────────────────────────────
const POLL_INTERVAL = 15_000       // 15 seconds
const LIVE_BADGE_DURATION = 3 * 60_000  // 3 minutes
const SSE_RECONNECT_DELAY = 5_000

// ─── Helpers ────────────────────────────────────────────────────────
function localizeItem(item: RawNewsItem, locale: string): LocalizedNewsItem {
  return {
    ...item,
    title:
      (locale === "en"
        ? item.title_en
        : locale === "kz"
          ? item.title_kz
          : item.title_ru) || item.title_ru,
  }
}

function isLive(item: LocalizedNewsItem): boolean {
  if (!item._liveAt) return false
  return Date.now() - new Date(item._liveAt).getTime() < LIVE_BADGE_DURATION
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════
export function NewsFeed({
  initialNews,
  locale,
}: {
  initialNews: LocalizedNewsItem[]
  locale: string
}) {
  const t = useTranslations("NewsFeed")
  const [news, setNews] = useState<LocalizedNewsItem[]>(initialNews)
  const [pendingNews, setPendingNews] = useState<LocalizedNewsItem[]>([])
  const [isSSEConnected, setIsSSEConnected] = useState(false)
  const lastTimestampRef = useRef<string>(
    initialNews[0]
      ? new Date(initialNews[0].createdAt).toISOString()
      : new Date().toISOString()
  )
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sseRef = useRef<EventSource | null>(null)
  const isTabVisibleRef = useRef(true)

  // ── Merge new items without duplicates ──────────────────────────
  const mergeItems = useCallback(
    (incoming: LocalizedNewsItem[], mode: "prepend" | "pending") => {
      if (mode === "prepend") {
        setNews((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          const fresh = incoming.filter((n) => !existingIds.has(n.id))
          if (fresh.length === 0) return prev
          // Update last timestamp from the freshest item
          const newest = fresh[0]
          if (newest) {
            lastTimestampRef.current = new Date(newest.createdAt).toISOString()
          }
          return [...fresh, ...prev]
        })
      } else {
        setPendingNews((prev) => {
          const existingIds = new Set([
            ...prev.map((n) => n.id),
            ...news.map((n) => n.id),
          ])
          const fresh = incoming.filter((n) => !existingIds.has(n.id))
          return [...fresh, ...prev]
        })
      }
    },
    [news]
  )

  // ── Flush pending news into feed ────────────────────────────────
  const flushPending = useCallback(() => {
    if (pendingNews.length === 0) return
    setNews((prev) => {
      const existingIds = new Set(prev.map((n) => n.id))
      const fresh = pendingNews.filter((n) => !existingIds.has(n.id))
      if (fresh.length > 0 && fresh[0]) {
        lastTimestampRef.current = new Date(fresh[0].createdAt).toISOString()
      }
      return [...fresh, ...prev]
    })
    setPendingNews([])
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [pendingNews])

  // ── Polling fallback ────────────────────────────────────────────
  const doPoll = useCallback(async () => {
    // Skip polling if SSE is connected — SSE handles real-time
    if (sseRef.current?.readyState === EventSource.OPEN) return

    try {
      const res = await fetch(
        `/api/news/latest?after=${encodeURIComponent(lastTimestampRef.current)}`
      )
      if (!res.ok) return
      const data = await res.json()
      if (data.news && data.news.length > 0) {
        const localized = data.news.map((n: RawNewsItem) => ({
          ...localizeItem(n, locale),
          _liveAt: new Date().toISOString(),
        }))
        // If user is scrolled down, queue to pending; otherwise prepend directly
        const scrolledDown = window.scrollY > 300
        if (scrolledDown) {
          mergeItems(localized, "pending")
        } else {
          mergeItems(localized, "prepend")
        }
      }
    } catch (err) {
      console.error("Poll failed:", err)
    }
  }, [locale, mergeItems])

  // ── Pusher Connection ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return

    const PusherClient = require("pusher-js").default || require("pusher-js")
    
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    if (!key || key === "your-app-key") {
      console.warn("Pusher key missing, real-time updates disabled")
      return
    }

    const pusher = new PusherClient(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
    })

    pusher.connection.bind("connected", () => {
      setIsSSEConnected(true)
    })

    pusher.connection.bind("disconnected", () => {
      setIsSSEConnected(false)
    })

    const channel = pusher.subscribe("news-feed")
    
    channel.bind("new_news", (raw: RawNewsItem) => {
      try {
        const localized: LocalizedNewsItem = {
          ...localizeItem(raw, locale),
          _liveAt: raw._liveAt || new Date().toISOString(),
        }

        const scrolledDown = window.scrollY > 300
        if (scrolledDown) {
          mergeItems([localized], "pending")
        } else {
          mergeItems([localized], "prepend")
        }

        toast("📰 " + localized.title, {
          description: localized.category?.name || "News",
          duration: 4000,
        })
      } catch (err) {
        console.error("Pusher parse error:", err)
      }
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe("news-feed")
      pusher.disconnect()
      setIsSSEConnected(false)
    }
  }, [locale, mergeItems])

  // ── Polling timer (fallback when SSE drops) ─────────────────────
  useEffect(() => {
    const tick = () => {
      if (isTabVisibleRef.current) {
        doPoll()
      }
      pollTimerRef.current = setTimeout(tick, POLL_INTERVAL)
    }

    pollTimerRef.current = setTimeout(tick, POLL_INTERVAL)

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [doPoll])

  // ── Pause polling when tab is hidden ────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      isTabVisibleRef.current = document.visibilityState === "visible"
      // When tab becomes visible again, poll immediately
      if (isTabVisibleRef.current) {
        doPoll()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [doPoll])

  // ── Force re-render to expire LIVE badges ───────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      // Trigger re-render to update isLive() checks
      setNews((prev) => [...prev])
    }, 30_000)
    return () => clearInterval(timer)
  }, [])

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════
  if (news.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground border rounded-lg border-dashed">
        {t("empty") || "No news available yet."}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* ── Connection status indicator ── */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isSSEConnected
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse"
                : "bg-amber-500 animate-pulse"
            }`}
          />
          <span>{isSSEConnected ? (t("liveConnection") || "Live") : (t("connecting") || "Connecting...")}</span>
        </div>
      </div>

      {/* ── New news notification banner ── */}
      {pendingNews.length > 0 && (
        <button
          onClick={flushPending}
          className="news-notification-banner"
          aria-label="Show new articles"
        >
          <ChevronUp className="h-4 w-4 animate-bounce" />
          <span>
            {pendingNews.length}{" "}
            {pendingNews.length === 1
              ? (t("newArticle") || "new article")
              : (t("newArticles") || "new articles")}
          </span>
          <span className="hidden sm:inline opacity-75">
            — {t("clickToShow") || "click to show"}
          </span>
        </button>
      )}

      {/* ── News grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item, index) => {
          const renderAd = index > 0 && index % 4 === 0
          const isAdSense = index % 8 === 0
          const itemIsLive = isLive(item)

          return (
            <React.Fragment key={`wrap-${item.id}`}>
              {renderAd &&
                (isAdSense ? (
                  <AdSense
                    slot={`feed-ad-${index}`}
                    layout="in-article"
                    className="h-full"
                  />
                ) : (
                  <BannerAd
                    position="FEED"
                    className="h-[150px] md:h-auto"
                  />
                ))}
              <Link
                key={item.id}
                href={`/${locale}/news/${item.slug}`}
                className={`news-card group block overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:bg-muted/50 hover:shadow-md ${
                  itemIsLive ? "news-card-live" : ""
                }`}
                style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
              >
                {/* Image */}
                {item.imageUrl && (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      priority={index === 0}
                      className="object-cover transition-transform duration-500 group-hover:scale-105 bg-muted"
                    />
                    {/* LIVE badge overlay */}
                    {itemIsLive && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="live-badge">
                          <Radio className="h-3 w-3" />
                          LIVE
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors">
                      {item.category?.name || "Uncategorized"}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* LIVE badge (no-image fallback) */}
                      {itemIsLive && !item.imageUrl && (
                        <span className="live-badge">
                          <Radio className="h-3 w-3" />
                          LIVE
                        </span>
                      )}
                      <time dateTime={new Date(item.createdAt).toISOString()}>
                        {format(new Date(item.createdAt), "MMMM d, yyyy")}
                      </time>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold leading-tight tracking-tight line-clamp-3">
                    {item.title}
                  </h2>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Eye className="mr-1 h-3 w-3" />
                    {item.views} {t("views")}
                  </div>
                </div>
              </Link>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
