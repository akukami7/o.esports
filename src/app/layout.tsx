import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background antialiased selection:bg-foreground selection:text-background`}>
        {children}
      </body>
    </html>
  )
}
