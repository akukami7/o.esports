"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getActiveBanner, trackBannerClick } from "@/app/actions/banners"
import type { Banner } from "@prisma/client"

interface BannerAdProps {
  position: "SIDEBAR" | "IN_ARTICLE" | "FEED"
  className?: string
}

export function BannerAd({ position, className = "" }: BannerAdProps) {
  const [banner, setBanner] = useState<Banner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBanner() {
      const activeBanner = await getActiveBanner(position)
      setBanner(activeBanner)
      setLoading(false)
    }
    loadBanner()
  }, [position])

  const handleClick = () => {
    if (!banner) return

    // Track click asynchronously in the background
    trackBannerClick(banner.id)

    // Build outbound URL with UTM tags if available
    let outboundUrl = banner.targetUrl
    
    try {
      const utmDataRaw = sessionStorage.getItem("utm_data")
      if (utmDataRaw) {
        const utmData = JSON.parse(utmDataRaw)
        const url = new URL(outboundUrl)
        
        if (utmData.source) url.searchParams.set("utm_source", utmData.source)
        if (utmData.medium) url.searchParams.set("utm_medium", utmData.medium)
        if (utmData.campaign) url.searchParams.set("utm_campaign", utmData.campaign)
        
        outboundUrl = url.toString()
      }
    } catch (e) {
      console.error("Failed to append UTM parameters", e)
    }

    // Open link in new tab
    window.open(outboundUrl, "_blank", "noopener,noreferrer")
  }

  if (loading) {
    return (
      <div className={`w-full bg-muted/30 animate-pulse rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground ${className} min-h-[120px]`}>
        Loading Advertisement...
      </div>
    )
  }

  if (!banner) {
    return null // Gracefully collapse if no banner is active
  }

  return (
    <div 
      className={`relative group cursor-pointer overflow-hidden rounded-lg border shadow-sm ${className}`}
      onClick={handleClick}
    >
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded shadow z-10 text-muted-foreground">
        Advertisement
      </div>
      <div className="relative w-full h-[150px] md:h-[200px]">
        <Image
          src={banner.imageUrl}
          alt={banner.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </div>
  )
}
