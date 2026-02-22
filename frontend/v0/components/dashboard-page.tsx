"use client"

import { useEffect, useState } from "react"
import {
  DollarSign, Clock, AlertTriangle, AlertCircle,
  Handshake, ShieldAlert, Bot, Send, ArrowUpRight,
  Pause, Tag, PenLine,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { api, type DashboardSummary, type Customer, type ActionLog } from "@/lib/api"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function getActivityIcon(actionType: string, description: string) {
  if (actionType === "pause")    return { icon: Pause,       color: "text-amber-500",   bg: "bg-amber-500/10" }
  if (actionType === "replied")  return { icon: Send,        color: "text-blue-700",    bg: "bg-blue-700/10" }
  if (actionType === "escalate") return { icon: ArrowUpRight,color: "text-red-500",     bg: "bg-red-500/10" }
  if (actionType === "classify") return { icon: Tag,         color: "text-violet-600",  bg: "bg-violet-600/10" }
  if (actionType === "draft")    return { icon: PenLine,     color: "text-emerald-600", bg: "bg-emerald-600/10" }
  if (actionType === "schedule") return { icon: Send,        color: "text-teal-500",    bg: "bg-teal-500/10" }
  return { icon: Bot, color: "text-muted-foreground", bg: "bg-muted" }
}

const STATUS_COLORS: Record<string, string> = {
  current:  "bg-chart-1/10 text-chart-1 border-chart-1/20",
  overdue:  "bg-destructive/10 text-destructive border-destructive/20",
  paused:   "bg-chart-2/10 text-chart-2 border-chart-2/20",
  disputed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  resolved: "bg-muted text-muted-foreground border-border",
}

const STATUS_LABELS: Record<string, string> = {
  current: "Current", overdue: "Overdue", paused: "Promise to Pay",
  disputed: "Dispute", resolved: "Closed",
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.dashboard.summary(), api.customers.list()])
      .then(([s, c]) => { setSummary(s); setCustomers(c) })
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      Promise.all([api.dashboard.summary(), api.customers.list()])
        .then(([s, c]) => { setSummary(s); setCustomers(c) })
        .catch(e => console.warn("[dashboard] poll failed:", e))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const kpis = summary ? [
    { label: "Total Outstanding",  value: summary.kpis.total_outstanding, icon: DollarSign,    color: "text-foreground",    bg: "bg-card" },
    { label: "Current",            value: summary.kpis.current,           icon: Clock,         color: "text-chart-1",       bg: "bg-chart-1/5" },
    { label: "Overdue 1-30 days",  value: summary.kpis.overdue_1_to_30,  icon: AlertTriangle, color: "text-chart-3",       bg: "bg-chart-3/5" },
    { label: "Overdue 30+ days",   value: summary.kpis.overdue_30_plus,  icon: AlertCircle,   color: "text-destructive",   bg: "bg-destructive/5" },
    { label: "Promise to Pay",     value: summary.kpis.promise_to_pay,   icon: Handshake,     color: "text-violet-600",    bg: "bg-violet-600/5" },
    { label: "Disputes",           value: summary.kpis.disputes,          icon: ShieldAlert,   color: "text-orange-500",    bg: "bg-orange-500/5" },
  ] : []

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      {/* Agent banner */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-8 py-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs text-muted-foreground">
            Fora is active — monitoring inbox and adjusting schedules in real time
          </span>
        </div>
      </div>

      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">AR portfolio health at a glance</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-6 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
              </div>
              <p className={cn("mt-3 text-2xl font-bold tracking-tight", kpi.color)}>
                {formatCurrency(kpi.value)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="mt-6 grid grid-cols-5 gap-6">
          {/* Top customers */}
          <div className="col-span-3 rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Top Customers by Outstanding</h2>
              <p className="text-xs text-muted-foreground">Highest outstanding balances</p>
            </div>
            <div className="divide-y divide-border">
              {customers.map(customer => {
                const inv = customer.invoices[0]
                return (
                  <div key={customer.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-card", customer.color)}>
                      {customer.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{customer.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-muted-foreground">{inv?.invoice_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {inv?.days_overdue ? `${inv.days_overdue}d overdue` : inv?.days_until_due ? `Due in ${inv.days_until_due}d` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv && (
                        <Badge variant="outline" className={cn("text-[11px] font-medium", STATUS_COLORS[inv.status] ?? STATUS_COLORS.current)}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(customer.total_outstanding)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div className="col-span-2 rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Recent Fora Activity</h2>
              <p className="text-xs text-muted-foreground">Automated actions taken</p>
            </div>
            <div className="divide-y divide-border">
              {(summary?.recent_activity ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                  <Bot className="h-7 w-7 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">No activity yet — upload rules and send an email to get started</p>
                </div>
              ) : (
                (summary?.recent_activity ?? []).map(log => {
                  const info = getActivityIcon(log.action_type, log.description)
                  return (
                    <div key={log.id} className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50">
                      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", info.bg)}>
                        <info.icon className={cn("h-3.5 w-3.5", info.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{log.action_type}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{log.description}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(log.created_at)}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
