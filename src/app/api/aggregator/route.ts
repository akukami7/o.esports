/**
 * POST /api/aggregator — Trigger the news aggregation pipeline.
 * GET  /api/aggregator — Check aggregator status.
 *
 * Protected by AGGREGATOR_SECRET env variable.
 */

import { NextRequest, NextResponse } from "next/server"
import { runAggregator } from "@/lib/aggregator"

export const dynamic = "force-dynamic"
export const maxDuration = 120 // allow up to 2 min for AI processing

// Track state
let lastRun: { timestamp: string; result: Record<string, unknown> } | null = null
let isRunning = false

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.AGGREGATOR_SECRET
  if (!secret) return true // no secret = open access (dev mode)

  const auth = request.headers.get("authorization")
  const querySecret = request.nextUrl.searchParams.get("secret")

  return auth === `Bearer ${secret}` || querySecret === secret
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (isRunning) {
    return NextResponse.json(
      { error: "Aggregator is already running", lastRun },
      { status: 429 }
    )
  }

  isRunning = true

  try {
    const result = await runAggregator()

    lastRun = {
      timestamp: new Date().toISOString(),
      result: { ...result } as Record<string, unknown>,
    }

    return NextResponse.json({
      success: true,
      fetched: result.fetched,
      filtered: result.filtered,
      duplicates: result.duplicates,
      generated: result.generated,
      saved: result.saved,
      errors: result.errors,
      duration: result.duration,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Aggregation failed", message: (err as Error).message },
      { status: 500 }
    )
  } finally {
    isRunning = false
  }
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    status: isRunning ? "running" : "idle",
    lastRun,
    config: {
      maxPerRun: process.env.AGGREGATOR_MAX_PER_RUN || "5",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      hasApiKey: !!process.env.GEMINI_API_KEY,
    },
  })
}
