import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import prisma from "@/lib/prisma"
import { pusherServer } from "@/lib/pusher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default async function CreateNewsPage() {
  const categories = await prisma.category.findMany()

  async function createNews(formData: FormData) {
    "use server"

    const title = formData.get("title") as string
    const categoryId = formData.get("categoryId") as string
    const imageUrl = formData.get("imageUrl") as string
    const content = formData.get("content") as string

    // Simple slug generator
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

    const newNews = await prisma.news.create({
      data: {
        title_ru: title,
        slug,
        content_ru: content,
        imageUrl: imageUrl || null,
        categoryId,
        authorId: "Admin", // Mock auth
      },
      include: {
        category: true,
      }
    })

    await pusherServer.trigger('news-feed', 'new_news', {
      ...newNews,
      _liveAt: new Date().toISOString()
    })

    redirect("/admin/news")
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/news">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create News</h1>
      </div>

      <form action={createNews} className="space-y-6 bg-card border rounded-lg p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="Enter news title" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a category</option>
            {categories.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            name="imageUrl"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            name="content"
            required
            placeholder="Write the full news article here..."
            className="min-h-[200px]"
          />
        </div>

        <Button type="submit">Publish Article</Button>
      </form>
    </div>
  )
}
