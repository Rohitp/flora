"use client"

import { useState } from "react"
import {
  Mail,
  ArrowUpRight,
  Bot,
  Pause,
  Check,
  Clock,
  X,
  Send,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { customers, timelineEvents, type TimelineEvent } from "@/lib/data"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const customerList = Object.values(customers)

function StatusIcon({ status }: { status: TimelineEvent["status"] }) {
  switch (status) {
    case "completed":
      return <Check className="h-3.5 w-3.5" />
    case "sent":
      return <Send className="h-3.5 w-3.5" />
    case "pending":
      return <Clock className="h-3.5 w-3.5" />
    case "paused":
      return <Pause className="h-3.5 w-3.5" />
    case "cancelled":
      return <X className="h-3.5 w-3.5" />
  }
}

function TypeIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "email":
      return <Mail className="h-4 w-4" />
    case "escalation":
      return <ArrowUpRight className="h-4 w-4" />
    case "ai-action":
      return <Bot className="h-4 w-4" />
    case "call":
      return <Mail className="h-4 w-4" />
  }
}

function getNodeColor(event: TimelineEvent) {
  if (event.status === "completed") return "bg-success/10 text-success border-success/20"
  if (event.status === "sent") {
    if (event.dayOffset < 0) return "bg-chart-1/10 text-chart-1 border-chart-1/20"
    if (event.dayOffset <= 10) return "bg-chart-3/10 text-chart-3 border-chart-3/20"
    return "bg-destructive/10 text-destructive border-destructive/20"
  }
  if (event.status === "paused") return "bg-muted text-muted-foreground border-border"
  if (event.status === "pending") return "bg-chart-1/10 text-chart-1 border-chart-1/20"
  if (event.status === "cancelled") return "bg-muted text-muted-foreground border-border"
  return "bg-muted text-muted-foreground border-border"
}

function getLineColor(event: TimelineEvent) {
  if (event.dayOffset < 0) return "bg-chart-1/30"
  if (event.dayOffset === 0) return "bg-chart-3/50"
  if (event.dayOffset <= 15) return "bg-chart-3/30"
  return "bg-destructive/30"
}

function StatusBadge({ status }: { status: TimelineEvent["status"] }) {
  const styles: Record<string, string> = {
    completed: "bg-success/10 text-success border-success/20",
    sent: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    paused: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-muted text-muted-foreground/60 border-border line-through",
    scheduled: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  }
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", styles[status] || styles.pending)}>
      <StatusIcon status={status} />
      <span className="ml-1 capitalize">{status}</span>
    </Badge>
  )
}

// IDs of timeline events that should appear "paused"
const pausedEventIds = new Set(["tl9", "tl10"])

function TimelineNode({
  event,
  isLast,
  isPausedOverride,
}: {
  event: TimelineEvent
  isLast: boolean
  isPausedOverride?: boolean
}) {
  const isDueDate = event.dayOffset === 0
  const isPaused = isPausedOverride || event.status === "paused"

  return (
    <div className="relative flex gap-6">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all",
            isDueDate
              ? "h-12 w-12 border-chart-3 bg-chart-3/10 text-chart-3 ring-4 ring-chart-3/10"
              : isPaused
                ? "border-border bg-muted text-muted-foreground"
                : getNodeColor(event),
          )}
        >
          {isPaused && !event.aiGenerated ? (
            <Pause className="h-4 w-4" />
          ) : (
            <TypeIcon type={event.type} />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-6",
              isPaused ? "bg-border" : getLineColor(event)
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-8")}>
        <div
          className={cn(
            "rounded-xl border p-4 transition-all hover:shadow-sm",
            isDueDate
              ? "border-chart-3/30 bg-chart-3/5"
              : isPaused
                ? "border-l-4 border-l-amber-500 border-y border-r border-border bg-muted/40"
                : "border-border bg-card",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    "text-sm font-semibold text-foreground",
                    isPaused && "line-through text-muted-foreground"
                  )}
                >
                  {event.action}
                </h3>
                {event.aiGenerated && (
                  <Badge
                    variant="outline"
                    className="border-accent/20 bg-accent/10 text-[9px] font-medium text-accent"
                  >
                    <Bot className="mr-0.5 h-2.5 w-2.5" />
                    AI
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {event.date}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-medium",
                    event.audience === "Customer"
                      ? "border-chart-1/20 bg-chart-1/5 text-chart-1"
                      : "border-chart-5/20 bg-chart-5/5 text-chart-5"
                  )}
                >
                  {event.audience}
                </Badge>
                <StatusBadge status={isPaused ? "paused" : event.status} />
                {event.dayOffset !== 0 && (
                  <span
                    className={cn(
                      "font-mono text-[11px] font-medium",
                      event.dayOffset < 0
                        ? "text-chart-1"
                        : "text-destructive"
                    )}
                  >
                    {event.dayOffset > 0 ? "+" : ""}
                    {event.dayOffset}d
                  </span>
                )}
                {isDueDate && (
                  <span className="font-mono text-[11px] font-bold text-chart-3">
                    DUE DATE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Paused note for overridden events */}
          {isPaused && !event.aiGenerated && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-2.5 text-xs text-amber-600">
              <Pause className="h-3.5 w-3.5 shrink-0" />
              Paused — payment commitment received
            </div>
          )}

          {event.note && (
            <div
              className={cn(
                "mt-3 flex items-center gap-2 rounded-lg p-2.5 text-xs",
                event.aiGenerated
                  ? "bg-accent/5 text-accent border border-accent/10"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {event.aiGenerated ? (
                <Bot className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Pause className="h-3.5 w-3.5 shrink-0" />
              )}
              {event.note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// The new AI-added node at the bottom
function AIAddedNode() {
  return (
    <div className="relative flex gap-6">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-violet-400/60 bg-violet-50 text-violet-500">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="rounded-xl border-2 border-dashed border-violet-300/50 bg-violet-50/50 p-4 transition-all hover:shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  AI Follow-up Check — Promise to Pay
                </h3>
                <Badge
                  variant="outline"
                  className="border-indigo-300/40 bg-indigo-100 text-[9px] font-medium text-indigo-600"
                >
                  <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                  AI Added
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  2026-02-24
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-chart-1/20 bg-chart-1/5 text-chart-1"
                >
                  Customer
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium bg-chart-1/10 text-chart-1 border-chart-1/20"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Scheduled
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TimelinePage() {
  console.log("[v0] TimelinePage rendering")
  const [selectedCustomer, setSelectedCustomer] = useState("Vertex Systems")
  const customer = customers[selectedCustomer]

  if (!customer) return null

  const overdueInvoice = customer.invoices.find((i) => i.status === "overdue")

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-card",
                  customer.color
                )}
              >
                {customer.initials}
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {customer.name}
                </h1>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="text-sm text-destructive font-semibold">
                    {formatCurrency(customer.totalOutstanding)} outstanding
                  </span>
                  {overdueInvoice && (
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] border-border"
                    >
                      {overdueInvoice.id}
                    </Badge>
                  )}
                  {overdueInvoice && (
                    <Badge
                      variant="outline"
                      className="text-[11px] border-destructive/20 bg-destructive/10 text-destructive"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {overdueInvoice.daysOverdue}d overdue
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
            >
              {customerList.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Modification Banner */}
      <div className="flex items-center justify-between border-b border-border bg-indigo-50/60 px-8 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-xs text-indigo-700">
            Schedule modified by AI agent — 2 hours ago
          </span>
        </div>
        <a href="/inbox" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
          View Inbox Thread
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground">
              Collection Timeline
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing all scheduled and completed actions for{" "}
              {overdueInvoice?.id || "this customer"}
            </p>
          </div>

          <div>
            {timelineEvents.map((event, index) => (
              <TimelineNode
                key={event.id}
                event={event}
                isLast={false}
                isPausedOverride={pausedEventIds.has(event.id)}
              />
            ))}
            {/* AI-Added node at the bottom */}
            <AIAddedNode />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
