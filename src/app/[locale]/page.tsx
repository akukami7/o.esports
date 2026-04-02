import prisma from "@/lib/prisma"

import { NewsFeed } from "@/components/news-feed"

import { getTranslations } from "next-intl/server"

export const revalidate = 60 // Revalidate every minute

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations("NewsFeed")
  
  const news = await prisma.news.findMany({
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
      category: { select: { name: true } }
    },
    take: 10,
  })

  // Format payload for NewsFeed fallback logic
  const localizedNews = news.map(n => ({
    ...n,
    title: (locale === 'en' ? n.title_en : locale === 'kz' ? n.title_kz : n.title_ru) || n.title_ru,
  }))

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{t("latest")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <NewsFeed initialNews={localizedNews} locale={locale} />
    </div>
  )
}
