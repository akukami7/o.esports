import Link from "next/link"
import { LayoutDashboard, Newspaper, Folders } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Admin Panel</h2>
        </div>
        <nav className="grid items-start px-4 text-sm font-medium">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/news"
            className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
          >
            <Newspaper className="h-4 w-4" />
            News
          </Link>
          <Link
            href="/admin/categories"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Folders className="h-4 w-4" />
            Categories
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
