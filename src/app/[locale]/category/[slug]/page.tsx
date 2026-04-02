import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Eye } from "lucide-react"

import prisma from "@/lib/prisma"

export const revalidate = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function localize(item: Record<string, any>, field: string, locale: string): string {
  return item[`${field}_${locale}`] || item[`${field}_ru`] || ""
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string, locale: string }
}) {
  const { locale } = params

  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  })

  if (!category) {
    notFound()
  }

  const news = await prisma.news.findMany({
    where: { categoryId: category.id },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight capitalize">{category.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item) => {
          const title = localize(item, "title", locale)
          return (
            <Link
              key={item.id}
              href={`/${locale}/news/${item.slug}`}
              className="group block overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-muted/50"
            >
              {item.imageUrl && (
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <time dateTime={item.createdAt.toISOString()}>
                    {format(item.createdAt, "MMMM d, yyyy")}
                  </time>
                  <div className="flex items-center">
                    <Eye className="mr-1 h-3 w-3" />
                    {item.views}
                  </div>
                </div>
                <h2 className="text-xl font-semibold leading-tight tracking-tight">
                  {title}
                </h2>
              </div>
            </Link>
          )
        })}
      </div>

      {news.length === 0 && (
        <div className="text-center py-20 text-muted-foreground border rounded-lg border-dashed">
          No news found in this category.
        </div>
      )}
    </div>
  )
}
