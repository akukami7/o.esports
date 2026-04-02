"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const locales = [
  { code: "ru", label: "🇷🇺 RU" },
  { code: "en", label: "🇬🇧 EN" },
  { code: "kz", label: "🇰🇿 KZ" },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: string) {
    // Replace current locale prefix with new one
    const segments = pathname.split("/")
    segments[1] = newLocale
    router.push(segments.join("/"))
  }

  const _current = locales.find(l => l.code === locale) // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code)}
            className={locale === l.code ? "bg-accent" : ""}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
