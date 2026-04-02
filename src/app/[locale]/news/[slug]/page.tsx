import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Calendar, User, Eye } from "lucide-react"

import prisma from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { AdSense } from "@/components/adsense"
import { BannerAd } from "@/components/banner-ad"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export const revalidate = 60

// Helper: pick localized field with ru fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function localize(article: Record<string, any>, field: string, locale: string): string {
  const localized = article[`${field}_${locale}`]
  return localized || article[`${field}_ru`] || ""
}

export async function generateMetadata({ params }: { params: { slug: string, locale: string } }): Promise<Metadata> {
  const article = await prisma.news.findUnique({
    where: { slug: params.slug },
  })

  if (!article) return {}

  const title = localize(article, "title", params.locale)
  const abstract = localize(article, "content", params.locale).substring(0, 150) + "..."

  return {
    title,
    description: abstract,
    openGraph: {
      title,
      description: abstract,
      type: "article",
      publishedTime: article.createdAt.toISOString(),
      authors: [article.authorId],
      images: article.imageUrl ? [article.imageUrl] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: abstract,
      images: article.imageUrl ? [article.imageUrl] : [],
    },
  }
}

export default async function NewsArticlePage({
  params,
}: {
  params: { slug: string, locale: string }
}) {
  const t = await getTranslations("NewsFeed")
  const { locale } = params

  const article = await prisma.news.findUnique({
    where: { slug: params.slug },
    include: { category: true },
  })

  if (!article) {
    notFound()
  }

  const title = localize(article, "title", locale)
  const content = localize(article, "content", locale)

  // Related news
  const related = await prisma.news.findMany({
    where: {
      categoryId: article.categoryId,
      id: { not: article.id },
    },
    select: {
      id: true,
      title_ru: true,
      title_en: true,
      title_kz: true,
      slug: true,
      imageUrl: true,
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  })

  await prisma.news.update({
    where: { id: article.id },
    data: { views: { increment: 1 } },
  })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    image: article.imageUrl ? [article.imageUrl] : [],
    datePublished: article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: [{
      "@type": "Person",
      name: article.authorId,
    }],
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Button variant="ghost" asChild className="mb-6 -ml-4">
        <Link href={`/${locale}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Main Article Content */}
        <div className="xl:col-span-8 space-y-8">
          <article className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                  {article.category.name}
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  <time dateTime={article.createdAt.toISOString()}>
                    {format(article.createdAt, "MMMM d, yyyy")}
                  </time>
                </div>
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  {article.authorId}
                </div>
                <div className="flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  {article.views + 1} {t("views")}
                </div>
              </div>
            </div>

            {article.imageUrl && (
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={article.imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div className="prose prose-neutral dark:prose-invert max-w-none text-lg leading-relaxed whitespace-pre-wrap">
              {content.split('\n\n').map((paragraph: string, idx: number, arr: string[]) => {
                const middleIndex = Math.floor(arr.length / 2)
                return (
                  <React.Fragment key={idx}>
                    <p>{paragraph}</p>
                    {idx === middleIndex && (
                      <div className="my-8">
                        <BannerAd position="IN_ARTICLE" />
                        <AdSense slot={`in-article-${article.id}`} layout="in-article" className="mt-4" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </article>

          {related.length > 0 && (
            <div className="mt-16 border-t pt-8">
              <h2 className="text-2xl font-bold tracking-tight mb-6">{t("related")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {related.map((item) => {
                  const relTitle = localize(item, "title", locale)
                  return (
                    <Link
                      key={item.id}
                      href={`/${locale}/news/${item.slug}`}
                      className="group block space-y-3"
                    >
                      {item.imageUrl ? (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                          <Image
                            src={item.imageUrl}
                            alt={relTitle}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full rounded-lg border bg-muted" />
                      )}
                      <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                        {relTitle}
                      </h3>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="xl:col-span-4 hidden xl:block">
          <div className="sticky top-24 space-y-8">
            <h3 className="font-semibold text-lg text-muted-foreground uppercase tracking-widest border-b pb-2">
              Sponsored
            </h3>
            <BannerAd position="SIDEBAR" className="h-[300px]" />
            <AdSense slot="sidebar-ad-1" layout="display" className="h-[300px]" />
            <BannerAd position="SIDEBAR" className="h-[300px]" />
          </div>
        </aside>
      </div>
    </div>
  )
}
