import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Toaster } from "@/components/ui/sonner"
import { UTMTracker } from "@/components/utm-tracker"
import { Suspense } from "react"

import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const ogLocale = locale === "en" ? "en_US" : locale === "ru" ? "ru_RU" : "kk_KZ"

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: {
      default: "o.esports - Minimalist Esports News",
      template: "%s | o.esports",
    },
    description: "Your daily dose of esports news, matches, and analytics.",
    openGraph: {
      title: "o.esports - Premier Esports News",
      description: "Stay up to date with the competitive scene: CS2, Dota 2, Valorant and more.",
      url: `/${locale}`,
      siteName: "o.esports",
      locale: ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "o.esports",
      description: "Your daily dose of esports news, matches, and analytics.",
    },
  }
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster position="bottom-right" />
        <Suspense fallback={null}>
          <UTMTracker />
        </Suspense>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
