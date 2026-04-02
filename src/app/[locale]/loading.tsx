export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-48 bg-muted rounded"></div>
        <div className="h-4 w-64 bg-muted rounded"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="block overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="relative aspect-video w-full bg-muted"></div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 bg-muted rounded-full"></div>
                <div className="h-3 w-24 bg-muted rounded"></div>
              </div>
              <div className="h-6 w-full bg-muted rounded"></div>
              <div className="h-6 w-2/3 bg-muted rounded"></div>
              <div className="flex items-center mt-2">
                <div className="h-3 w-16 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
