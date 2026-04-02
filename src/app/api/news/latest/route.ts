import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const after = searchParams.get("after")
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 50)

  try {
    const where = after
      ? { createdAt: { gt: new Date(after) } }
      : {}

    const news = await prisma.news.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title_ru: true,
        title_en: true,
        title_kz: true,
        slug: true,
        imageUrl: true,
        createdAt: true,
        views: true,
        category: { select: { name: true } },
      },
      take: limit,
    })

    return NextResponse.json({
      news,
      count: news.length,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-News-Count": String(news.length),
      },
    })
  } catch (error) {
    console.error("Failed to fetch latest news:", error)
    return NextResponse.json(
      { news: [], count: 0, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}
