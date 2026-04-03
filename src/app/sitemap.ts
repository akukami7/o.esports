import { MetadataRoute } from "next"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const locales = ["ru", "en", "kz"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  const newsItems = await prisma.news.findMany({
    select: {
      slug: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const categories = await prisma.category.findMany({
    select: {
      slug: true,
      createdAt: true,
    },
  })

  const entries: MetadataRoute.Sitemap = []

  // Root pages per locale
  for (const locale of locales) {
    entries.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    })
  }

  // Category pages per locale
  for (const category of categories) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}/category/${category.slug}`,
        lastModified: category.createdAt,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
  }

  // News pages per locale
  for (const news of newsItems) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}/news/${news.slug}`,
        lastModified: news.updatedAt || news.createdAt,
        changeFrequency: "daily",
        priority: 0.8,
      })
    }
  }

  return entries
}
