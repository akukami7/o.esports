"use server"
import prisma from "@/lib/prisma"
import { headers } from "next/headers"

// Basic in-memory rate limiter (Clears on server restart, production should use Redis/Upstash)
const clickLimits = new Map<string, number>()
const LIMIT_WINDOW = 60 * 1000 // 1 minute
const _MAX_CLICKS = 5 // eslint-disable-line @typescript-eslint/no-unused-vars

export async function trackBannerClick(bannerId: string) {
  try {
    const ip = headers().get("x-forwarded-for") || "unknown"
    const key = `${ip}-${bannerId}`

    const now = Date.now()
    const record = clickLimits.get(key)

    if (record) {
      if (now - record < LIMIT_WINDOW) {
        // Increment spam counter internally if we cared... for now just block it
        return { success: false, reason: "Rate limited. Slow down!" }
      }
    }

    // Register click timing
    clickLimits.set(key, now)

    await prisma.banner.update({
      where: { id: bannerId },
      data: {
        clicks: {
          increment: 1,
        },
      },
    })
  } catch (error) {
    console.error("Failed to track banner click:", error)
  }
}

export async function getActiveBanner(position: string) {
  try {
    // In a real high-traffic app, we would cache this aggressively or pick a random active one.
    // For this implementation, we pick the first active banner for the requested position.
    const banner = await prisma.banner.findFirst({
      where: {
        position,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc", // Newest first
      },
    })

    return banner
  } catch (error) {
    console.error("Failed to fetch banner:", error)
    return null
  }
}
