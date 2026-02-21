"use client"

import {
  DollarSign,
  Clock,
  AlertTriangle,
  AlertCircle,
  Handshake,
  ShieldAlert,
  Bot,
  Send,
  ArrowUpRight,
  Pause,
  Tag,
  PenLine,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { dashboardKPIs, topCustomers, recentActivity } from "@/lib/data"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const kpiCards = [
  {
    label: "Total Outstanding",
    value: dashboardKPIs.totalOutstanding,
    icon: DollarSign,
    color: "text-foreground",
    valueColor: "text-foreground",
    bgColor: "bg-card",
  },
  {
    label: "Current",
    value: dashboardKPIs.current,
    icon: Clock,
    color: "text-chart-1",
    valueColor: "text-chart-1",
    bgColor: "bg-chart-1/5",
  },
  {
    label: "Overdue 1-30 days",
    value: dashboardKPIs.overdue1to30,
    icon: AlertTriangle,
    color: "text-chart-3",
    valueColor: "text-chart-3",
    bgColor: "bg-chart-3/5",
  },
  {
    label: "Overdue 30+ days",
    value: dashboardKPIs.overdue30plus,
    icon: AlertCircle,
    color: "text-destructive",
    valueColor: "text-destructive",
    bgColor: "bg-destructive/5",
  },
  {
    label: "Promise to Pay",
    value: dashboardKPIs.promiseToPay,
    icon: Handshake,
    color: "text-violet-600",
    valueColor: "text-violet-600",
    bgColor: "bg-violet-600/5",
  },
  {
    label: "Disputes",
    value: dashboardKPIs.disputes,
    icon: ShieldAlert,
    color: "text-orange-500",
    valueColor: "text-orange-500",
    bgColor: "bg-orange-500/5",
  },
]

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    current: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
    p2p: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    dispute: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    closed: "bg-muted text-muted-foreground border-border",
  }
  const labels: Record<string, string> = {
    current: "Current",
    overdue: "Overdue",
    p2p: "Promise to Pay",
    dispute: "Dispute",
    closed: "Closed",
  }
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium", styles[status])}
    >
      {labels[status]}
    </Badge>
  )
}

const agentBadges: Record<string, { label: string; color: string }> = {
  "NovaTech Corp": { label: "Reminders Active", color: "bg-chart-1/10 text-chart-1 border-chart-1/20" },
  "Pinnacle Corp": { label: "Paused -- P2P", color: "bg-success/10 text-success border-success/20" },
  "Meridian LLC": { label: "Escalated", color: "bg-destructive/10 text-destructive border-destructive/20" },
  "Acme Inc": { label: "Reminders Active", color: "bg-chart-1/10 text-chart-1 border-chart-1/20" },
  "GlobalTech Solutions": { label: "Disputed", color: "bg-destructive/10 text-destructive border-destructive/20" },
}

function getActivityIcon(action: string) {
  if (action.toLowerCase().includes("paused"))
    return { icon: Pause, color: "text-amber-500", bg: "bg-amber-500/10" }
  if (action.toLowerCase().includes("sent reminder"))
    return { icon: Send, color: "text-blue-700", bg: "bg-blue-700/10" }
  if (action.toLowerCase().includes("escalation"))
    return { icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-500/10" }
  if (action.toLowerCase().includes("auto-classified"))
    return { icon: Tag, color: "text-violet-600", bg: "bg-violet-600/10" }
  if (action.toLowerCase().includes("draft"))
    return { icon: PenLine, color: "text-emerald-600", bg: "bg-emerald-600/10" }
  if (action.toLowerCase().includes("follow-up"))
    return { icon: Send, color: "text-teal-500", bg: "bg-teal-500/10" }
  return { icon: Bot, color: "text-muted-foreground", bg: "bg-muted" }
}

export function DashboardPage() {
  console.log("[v0] DashboardPage rendering, data:", {
    kpiCount: kpiCards.length,
    customerCount: topCustomers.length,
    activityCount: recentActivity.length,
  })

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      {/* Active Agent Banner */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-8 py-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs text-muted-foreground">
            AI Agent is active — monitoring inbox and adjusting schedules in real time
          </span>
        </div>
        <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View Activity Log
        </a>
      </div>

      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AR portfolio health at a glance
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-6 gap-4">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    kpi.bgColor
                  )}
                >
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
              </div>
              <p className={cn("mt-3 text-2xl font-bold tracking-tight", kpi.valueColor)}>
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
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Top Customers by Outstanding
                </h2>
                <p className="text-xs text-muted-foreground">
                  Highest outstanding balances
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {topCustomers.map((customer) => {
                const agentBadge = agentBadges[customer.name]
                return (
                  <div
                    key={customer.name}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-card",
                        customer.color
                      )}
                    >
                      {customer.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {customer.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {customer.invoiceId}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {"daysOverdue" in customer && customer.daysOverdue
                            ? `${customer.daysOverdue}d overdue`
                            : `Due in ${customer.daysUntilDue}d`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={customer.status} />
                      {agentBadge && (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-medium gap-1", agentBadge.color)}
                        >
                          <Bot className="h-3 w-3" />
                          {agentBadge.label}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(customer.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div className="col-span-2 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Recent AI Activity
                </h2>
                <p className="text-xs text-muted-foreground">
                  Automated actions taken
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.map((activity) => {
                const iconInfo = getActivityIcon(activity.action)
                const IconComponent = iconInfo.icon
                return (
                  <div
                    key={activity.id}
                    className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        iconInfo.bg
                      )}
                    >
                      <IconComponent className={cn("h-3.5 w-3.5", iconInfo.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activity.detail}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
