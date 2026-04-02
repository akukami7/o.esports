"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"

interface AdSenseProps {
  className?: string
  slot: string
  layout?: string
  format?: string
  responsive?: boolean
}

export function AdSense({
  className = "",
  slot,
  layout = "in-article",
  format = "fluid",
  responsive = true,
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pathname = usePathname() // Re-mount ad on route change if necessary

  useEffect(() => {
    try {
      // @ts-expect-error adsbygoogle is not typed
      const adsbygoogle = window.adsbygoogle || []
      
      // Ensures that adsbygoogle is only pushed once per mounted slot
      if (adRef.current && !adRef.current.getAttribute('data-ad-status')) {
        adsbygoogle.push({})
      }
    } catch (e) {
      console.error("AdSense error:", e)
    }
  }, [pathname]) // Trigger when navigation changes

  // Dummy Publisher ID for now as requested
  const clientPublisherId = "ca-pub-0000000000000000"

  return (
    <div className={`overflow-hidden flex items-center justify-center bg-accent/20 rounded-lg min-h-[100px] relative ${className}`}>
      {/* Visual placeholder for local dev without AdSense script loaded */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50 text-xs pointer-events-none select-none">
        <span>Advertisement</span>
        <span className="text-[9px]">Google AdSense (Slot: {slot})</span>
      </div>

      <Script
        id="adsbygoogle-init"
        strategy="lazyOnload"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientPublisherId}`}
        crossOrigin="anonymous"
      />
      
      <ins
        ref={adRef}
        className="adsbygoogle relative z-10 w-full"
        style={{ display: "block", textAlign: "center" }}
        data-ad-layout={layout}
        data-ad-format={format}
        data-ad-client={clientPublisherId}
        data-ad-slot={slot}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  )
}
