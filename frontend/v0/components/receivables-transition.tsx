"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function ReceivablesTransition({
  active,
  onDone,
}: {
  active: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<"idle" | "entering" | "visible" | "exiting">("idle")

  useEffect(() => {
    if (!active) {
      setPhase("idle")
      return
    }

    setPhase("entering")
    const enterTimer = setTimeout(() => setPhase("visible"), 30)
    const routeTimer = setTimeout(() => {
      router.push("/dashboard")
    }, 2000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(routeTimer)
    }
  }, [active, router, onDone])

  if (phase === "idle") return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f1219] transition-opacity duration-500"
      style={{
        opacity: phase === "entering" ? 0 : phase === "exiting" ? 0 : 1,
      }}
    >
      <div
        className="flex flex-col items-center gap-6 transition-all duration-500"
        style={{
          opacity: phase === "visible" ? 1 : 0,
          transform: phase === "visible" ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <div className="relative flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a3040] border-t-[#3b82f6]" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            {"Let\u2019s try Chargebee Receivables\u2026"}
          </h1>
          <p className="mt-2 text-sm text-[#8a92a1]">
            Setting up your collections workspace.
          </p>
        </div>
      </div>
    </div>
  )
}
