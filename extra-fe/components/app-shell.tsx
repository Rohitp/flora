"use client"

import { usePathname } from "next/navigation"
import { ChargebeeSidebar } from "@/components/chargebee-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullscreen = pathname.startsWith("/receivables/setup")

  if (isFullscreen) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ChargebeeSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
