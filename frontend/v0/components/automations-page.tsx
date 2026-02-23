"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Mail,
  MoreHorizontal,
  ExternalLink,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type Automation,
  sampleAutomations,
  defaultAutomation,
  getEmailSummary,
} from "@/lib/automations-data"
import { api, type Rule } from "@/lib/api"

/* ------------------------------------------------------------------ */
/*  Status Toggle                                                      */
/* ------------------------------------------------------------------ */
function StatusToggle({
  status,
  onChange,
}: {
  status: "active" | "paused"
  onChange: (s: "active" | "paused") => void
}) {
  const isActive = status === "active"
  return (
    <button
      onClick={() => onChange(isActive ? "paused" : "active")}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        isActive ? "bg-[#22c55e]" : "bg-muted-foreground/20"
      )}
      role="switch"
      aria-checked={isActive}
    >
      <span
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-card shadow-sm transition-transform",
          isActive ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Segment Chips                                                      */
/* ------------------------------------------------------------------ */
function SegmentChips({ automation }: { automation: Automation }) {
  if (automation.segmentFilters.length === 0) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        All Customers
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {automation.segmentFilters.map((f, idx) => (
        <span
          key={idx}
          className="inline-flex items-center rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground"
        >
          {f.field}{" "}
          <span className="mx-0.5 text-muted-foreground">{f.operator}</span>{" "}
          {f.value}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Timeline Summary                                                   */
/* ------------------------------------------------------------------ */
function TimelineSummary({ automation }: { automation: Automation }) {
  const summary = getEmailSummary(automation.emailSteps)
  if (summary.count === 0) return null
  return (
    <div className="text-right">
      <p className="text-xs font-medium text-foreground">
        {summary.count} {summary.count === 1 ? "email" : "emails"} scheduled
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        First: {summary.firstLabel}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Last: {summary.lastLabel}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Overflow Menu                                                      */
/* ------------------------------------------------------------------ */
function OverflowMenu({ automationId }: { automationId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Automation actions</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem asChild>
          <Link href={`/automations/${automationId}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------------------------------------------------ */
/*  Automation Row                                                     */
/* ------------------------------------------------------------------ */
function AutomationRow({
  automation,
  onStatusChange,
}: {
  automation: Automation
  onStatusChange: (id: string, status: "active" | "paused") => void
}) {
  return (
    <div className="group flex items-start justify-between gap-6 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="min-w-0 flex-1">
        <Link
          href={`/automations/${automation.id}/edit`}
          className="text-sm font-semibold text-foreground hover:underline"
        >
          {automation.name}
        </Link>
        <div className="mt-2">
          <SegmentChips automation={automation} />
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-5">
        <TimelineSummary automation={automation} />
        <div className="flex items-center gap-2.5 pt-0.5">
          <div className="flex flex-col items-center gap-0.5">
            <StatusToggle
              status={automation.status}
              onChange={(s) => onStatusChange(automation.id, s)}
            />
            <span className="text-[10px] font-medium text-muted-foreground">
              {automation.status === "active" ? "Active" : "Paused"}
            </span>
          </div>
          <OverflowMenu automationId={automation.id} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Default Automation Section                                         */
/* ------------------------------------------------------------------ */
function DefaultAutomationSection({
  automation,
  onStatusChange,
  isLive,
}: {
  automation: Automation
  onStatusChange: (id: string, status: "active" | "paused") => void
  isLive: boolean
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-muted-foreground/60" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Default Automation
        </h2>
        {isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            Live
          </span>
        )}
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Applies to customers who do not match any other automation rules.
        </p>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-foreground">{automation.name}</p>
            <div className="mt-1.5">
              <SegmentChips automation={automation} />
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-5">
            <TimelineSummary automation={automation} />
            <div className="flex items-center gap-2.5 pt-0.5">
              <div className="flex flex-col items-center gap-0.5">
                <StatusToggle
                  status={automation.status}
                  onChange={(s) => onStatusChange(automation.id, s)}
                />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {automation.status === "active" ? "Active" : "Paused"}
                </span>
              </div>
              <OverflowMenu automationId={automation.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Mail className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <h2 className="mt-5 text-base font-semibold text-foreground">
        No reminder automations configured
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Create automated email sequences to follow up on unpaid invoices based on
        customer segments and due dates.
      </p>
      <Button size="sm" className="mt-6 gap-1.5" asChild>
        <Link href="/automations/create">
          <Plus className="h-3.5 w-3.5" />
          Create your first automation
        </Link>
      </Button>
    </div>
  )
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
function rulesToEmailSteps(rules: Rule[]) {
  return rules.map((r) => ({
    label: r.name,
    dayOffset: r.day_offset,
  }))
}

export function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(sampleAutomations)
  const [defaultAuto, setDefaultAuto] = useState<Automation>(defaultAutomation)
  const [liveRules, setLiveRules] = useState<Rule[]>([])

  useEffect(() => {
    api.rules.list().then((rules) => {
      setLiveRules(rules)
      if (rules.length > 0) {
        setDefaultAuto((prev) => ({
          ...prev,
          status: "active",
          emailSteps: rulesToEmailSteps(rules),
        }))
      }
    }).catch(() => {
      // backend not running — keep static defaults
    })
  }, [])

  function handleStatusChange(id: string, status: "active" | "paused") {
    if (id === "default") {
      setDefaultAuto((prev) => ({ ...prev, status }))
      return
    }
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    )
  }

  const hasAutomations = automations.length > 0

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Invoice Reminders
          </h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Automate reminder emails based on customer segments and due dates.
          </p>
        </div>
        {hasAutomations && (
          <Button size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/automations/create">
              <Plus className="h-3.5 w-3.5" />
              Create Automation
            </Link>
          </Button>
        )}
      </div>

      {!hasAutomations ? (
        <EmptyState />
      ) : (
        <div>
          <div className="flex flex-col gap-3">
            {automations.map((automation) => (
              <AutomationRow
                key={automation.id}
                automation={automation}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          <DefaultAutomationSection
            automation={defaultAuto}
            onStatusChange={handleStatusChange}
            isLive={liveRules.length > 0}
          />

          <div className="mt-6 flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
            <button className="text-xs font-medium text-primary hover:underline">
              Learn how reminder automation works
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
