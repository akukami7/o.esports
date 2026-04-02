"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslations, useLocale } from "next-intl"

export function Navbar() {
  const t = useTranslations("Navbar")
  const locale = useLocale()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 max-w-7xl">
        <div className="mr-4 flex">
          <Link href={`/${locale}`} className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block tracking-tight">
              {t("title")}
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href={`/${locale}`}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {t("home")}
            </Link>
            <Link
              href={`/${locale}/category/cs2`}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              CS2
            </Link>
            <Link
              href={`/${locale}/category/dota2`}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dota 2
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <Link
              href={`/${locale}/admin/news`}
              className="text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Admin
            </Link>
            <LanguageSwitcher />
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
