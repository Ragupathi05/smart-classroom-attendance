"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store"

export function DashboardHeader() {
  const { user } = useAuthStore()
  const [greeting, setGreeting] = useState("Good Evening")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const hours = new Date().getHours()
    if (hours < 12) {
      setGreeting("Good Morning")
    } else if (hours < 17) {
      setGreeting("Good Afternoon")
    } else {
      setGreeting("Good Evening")
    }
  }, [])

  return (
    <div className="border-b border-border/40 pb-5">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl animate-fade-in-up">
        {mounted ? `${greeting}, ${user?.name || "Representative"}` : "Welcome"} 👋
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome to your operational dashboard command center.
      </p>
    </div>
  )
}
