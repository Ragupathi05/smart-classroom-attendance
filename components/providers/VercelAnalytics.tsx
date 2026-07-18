"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"

export function VercelAnalytics() {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Check if hosted on vercel or localhost to prevent script loading error on GitHub Pages
    const hostname = window.location.hostname
    if (
      hostname.endsWith(".vercel.app") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    ) {
      setShouldRender(true)
    }
  }, [])

  if (!shouldRender) return null

  return <Analytics />
}
