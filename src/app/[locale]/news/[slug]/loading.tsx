export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-pulse">
      <div className="h-10 w-32 bg-muted rounded mb-6 -ml-4"></div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8 space-y-8">
          <div className="space-y-4">
            <div className="h-6 w-20 bg-muted rounded-full"></div>
            <div className="h-12 w-full bg-muted rounded"></div>
            <div className="h-12 w-3/4 bg-muted rounded"></div>
            <div className="flex gap-4 mt-4">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </div>
          </div>

          <div className="aspect-[21/9] w-full rounded-lg bg-muted"></div>

          <div className="space-y-4 pt-4">
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-5/6 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-4/6 bg-muted rounded"></div>
          </div>
        </div>

        <aside className="xl:col-span-4 hidden xl:block">
          <div className="sticky top-24 space-y-8">
            <div className="h-6 w-32 bg-muted rounded border-b pb-2"></div>
            <div className="h-[300px] w-full bg-muted rounded-lg"></div>
            <div className="h-[300px] w-full bg-muted rounded-lg"></div>
          </div>
        </aside>
      </div>
    </div>
  )
}
