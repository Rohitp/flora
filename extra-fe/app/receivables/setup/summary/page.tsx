"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Mail, Users, Check, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Timeline step data                                                 */
/* ------------------------------------------------------------------ */
const timelineSteps = [
  {
    day: "Day -3",
    label: "Friendly reminder",
    description: "A gentle nudge before the due date to keep payment top of mind",
    reasoning: "Prevents invoices from slipping into overdue status",
    color: "bg-[#3b82f6]",
    ringColor: "ring-[#3b82f6]/20",
  },
  {
    day: "Day 0",
    label: "Due date notice",
    description: "Clear, professional reminder that payment is now due",
    reasoning: "Establishes accountability on the actual due date",
    color: "bg-[#f59e0b]",
    ringColor: "ring-[#f59e0b]/20",
  },
  {
    day: "Day 7",
    label: "Firm follow-up",
    description: "Direct tone shift signaling the invoice is overdue",
    reasoning: "Escalating after 7 days signals urgency without damaging relationships",
    color: "bg-[#f97316]",
    ringColor: "ring-[#f97316]/20",
  },
  {
    day: "Day 14",
    label: "Final notice",
    description: "Last automated reminder before manual escalation",
    reasoning: "A clear deadline creates urgency and reduces further delays",
    color: "bg-[#ef4444]",
    ringColor: "ring-[#ef4444]/20",
  },
]

/* ------------------------------------------------------------------ */
/*  Fora Avatar                                                        */
/* ------------------------------------------------------------------ */
function ForaAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? 40 : 32
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full",
        size === "md" ? "h-10 w-10" : "h-8 w-8"
      )}
    >
      <Image
        src="/images/fora-hero.jpg"
        alt="Fora"
        width={dim}
        height={dim}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Timeline Component                                                 */
/* ------------------------------------------------------------------ */
function PolicyTimeline() {
  return (
    <div className="flex flex-col gap-0">
      {timelineSteps.map((step, i) => (
        <div key={step.day} className="flex gap-4">
          {/* Vertical line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full ring-4",
                step.color,
                step.ringColor
              )}
            >
              <span className="text-[10px] font-bold text-white">
                {i + 1}
              </span>
            </div>
            {i < timelineSteps.length - 1 && (
              <div className="w-px flex-1 bg-[#e2e8f0]" />
            )}
          </div>

          {/* Content */}
          <div className="pb-8">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-[#0f172a]">
                {step.day}
              </span>
              <span className="text-xs text-[#94a3b8]">{"\u2014"}</span>
              <span className="text-sm font-medium text-[#334155]">
                {step.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#64748b]">
              {step.description}
            </p>
            <p className="mt-1 text-[11px] italic text-[#94a3b8]">
              {step.reasoning}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page states                                                        */
/* ------------------------------------------------------------------ */
type PageState = "loading" | "summary" | "activating" | "success"

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function SetupSummaryPage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>("loading")

  /* Brief loading state for the "AI is generating" feel */
  useEffect(() => {
    const timer = setTimeout(() => setPageState("summary"), 1400)
    return () => clearTimeout(timer)
  }, [])

  function handleActivate() {
    setPageState("activating")

    setTimeout(() => {
      setPageState("success")
    }, 2000)

    setTimeout(() => {
      router.push("/receivables/automations?from=setup")
    }, 3800)
  }

  /* ---- Loading state ---- */
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center text-center animate-in fade-in duration-500">
          <Loader2 className="mb-4 h-6 w-6 animate-spin text-[#3b82f6]" />
          <p className="text-sm font-medium text-[#334155]">
            Fora is preparing your strategy...
          </p>
        </div>
      </div>
    )
  }

  /* ---- Activating state ---- */
  if (pageState === "activating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center text-center animate-in fade-in duration-500">
          <div className="mb-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
          </div>
          <h2 className="text-lg font-semibold text-[#0f172a]">
            Configuring your invoice reminder automations...
          </h2>
          <p className="mt-2 text-sm text-[#94a3b8]">
            This will only take a moment.
          </p>
        </div>
      </div>
    )
  }

  /* ---- Success state ---- */
  if (pageState === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]/10">
            <Check className="h-7 w-7 text-[#22c55e]" />
          </div>
          <h2 className="text-lg font-semibold text-[#0f172a]">
            Invoice reminders are now active.
          </h2>
          <p className="mt-2 text-sm text-[#94a3b8]">
            Redirecting to your automations...
          </p>
        </div>
      </div>
    )
  }

  /* ---- Summary state ---- */
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center border-b border-[#e2e8f0] px-6 py-4">
        <div className="flex items-center gap-3">
          <ForaAvatar />
          <div>
            <h1 className="text-sm font-semibold text-[#0f172a]">
              Review &amp; Activate
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Guided setup with Fora
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-6 py-10 animate-in fade-in slide-in-from-bottom-3 duration-700">
          {/* Fora intro message */}
          <div className="mb-8 flex gap-3">
            <ForaAvatar size="md" />
            <div className="rounded-xl bg-[#f1f5f9] px-5 py-4">
              <p className="text-sm leading-relaxed text-[#1e293b]">
                {"Here\u2019s the reminder strategy I\u2019ve designed for you."}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">
                This balances early nudges with gradual escalation, keeping customer relationships intact while maximizing collection rates.
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-2">
            <PolicyTimeline />
          </div>

          {/* Meta details */}
          <div className="mt-2 flex gap-6 rounded-lg border border-[#e2e8f0] bg-[#fafbfc] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-[#64748b]" />
              <div>
                <p className="text-xs text-[#94a3b8]">Channel</p>
                <p className="text-sm font-medium text-[#0f172a]">Email</p>
              </div>
            </div>
            <div className="h-auto w-px bg-[#e2e8f0]" />
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-[#64748b]" />
              <div>
                <p className="text-xs text-[#94a3b8]">Applies to</p>
                <p className="text-sm font-medium text-[#0f172a]">
                  All customers
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex items-center gap-3">
            <Button
              onClick={handleActivate}
              size="sm"
              className="gap-1.5 bg-[#3b82f6] text-xs hover:bg-[#2563eb]"
            >
              <Check className="h-3.5 w-3.5" />
              Activate reminders
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => router.push("/receivables/setup")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Edit something
            </Button>
          </div>

          <p className="mt-4 text-xs text-[#94a3b8]">
            You can modify or pause reminders at any time from the Automations page.
          </p>
        </div>
      </div>
    </div>
  )
}
