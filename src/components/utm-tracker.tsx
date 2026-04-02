"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

export function UTMTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const utmSource = searchParams.get("utm_source")
    const utmMedium = searchParams.get("utm_medium")
    const utmCampaign = searchParams.get("utm_campaign")

    if (utmSource || utmMedium || utmCampaign) {
      const utmData = {
        source: utmSource || "",
        medium: utmMedium || "",
        campaign: utmCampaign || "",
        timestamp: new Date().toISOString(),
      }
      sessionStorage.setItem("utm_data", JSON.stringify(utmData))
    }
  }, [searchParams])

  return null
}
