import prisma from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MousePointerClick, RefreshCcw } from "lucide-react"
import { revalidatePath } from "next/cache"
import Image from "next/image"

export default async function AdminBannersPage() {
  const banners = await prisma.banner.findMany({
    orderBy: { createdAt: "desc" },
  })

  // Basic Server Action inline
  async function addBanner(formData: FormData) {
    "use server"
    
    const name = formData.get("name") as string
    const imageUrl = formData.get("imageUrl") as string
    const targetUrl = formData.get("targetUrl") as string
    const position = formData.get("position") as string

    await prisma.banner.create({
      data: {
        name,
        imageUrl,
        targetUrl,
        position,
      },
    })
    
    revalidatePath("/admin/banners")
    revalidatePath("/")
  }

  async function toggleBanner(formData: FormData) {
    "use server"
    const id = formData.get("id") as string
    const isActive = formData.get("isActive") === "true"

    await prisma.banner.update({
      where: { id },
      data: { isActive: !isActive },
    })

    revalidatePath("/admin/banners")
    revalidatePath("/")
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Banner Ads Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 border rounded-lg p-6 bg-card shadow-sm h-fit">
          <h2 className="text-xl font-semibold mb-6">Create New Banner</h2>
          
          <form action={addBanner} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input id="name" name="name" required placeholder="e.g. Summer Promo" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (Design)</Label>
              <Input id="imageUrl" name="imageUrl" required placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetUrl">Target Link</Label>
              <Input id="targetUrl" name="targetUrl" required placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Placement Position</Label>
              <select
                id="position"
                name="position"
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="FEED">Home Feed Array</option>
                <option value="IN_ARTICLE">Inside Article Body</option>
                <option value="SIDEBAR">Article Sidebar</option>
              </select>
            </div>

            <Button type="submit" className="w-full mt-4">Create Banner</Button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Active & Historic Banners</h2>
          {banners.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
              No banners created yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banners.map((banner) => (
                <div key={banner.id} className="flex flex-col border rounded-lg overflow-hidden bg-card shadow-sm">
                  <div className="relative h-32 w-full bg-muted">
                    <Image
                      src={banner.imageUrl}
                      alt={banner.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded shadow-sm text-white ${banner.isActive ? "bg-green-500" : "bg-neutral-500"}`}>
                        {banner.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold leading-tight mb-1">{banner.name}</h3>
                      <p className="text-xs text-muted-foreground break-all">{banner.targetUrl}</p>
                      <div className="mt-4 flex items-center space-x-4 text-sm text-foreground/80">
                        <span className="flex items-center"><MousePointerClick className="w-4 h-4 mr-1 text-primary"/> {banner.clicks} Clicks</span>
                        <span className="flex items-center"><RefreshCcw className="w-4 h-4 mr-1 text-primary"/> {banner.position}</span>
                      </div>
                    </div>
                    
                    <form action={toggleBanner} className="mt-4 pt-4 border-t">
                      <input type="hidden" name="id" value={banner.id} />
                      <input type="hidden" name="isActive" value={banner.isActive.toString()} />
                      <Button variant={banner.isActive ? "destructive" : "outline"} className="w-full" size="sm">
                        {banner.isActive ? "Disable Banner" : "Enable Banner"}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
