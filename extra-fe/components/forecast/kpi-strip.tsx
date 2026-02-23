"use client"

import { Info } from "lucide-react"
import { formatCurrency } from "@/lib/forecast-data"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface KpiCardProps {
  label: string
  value: string
  tooltip: string
}

function KpiCard({ label, value, tooltip }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/40" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="text-xl font-semibold tracking-tight text-card-foreground">{value}</span>
    </div>
  )
}

export function KpiStrip({
  totalExpected,
  thisMonth,
  nextMonth,
  activeSubscriptions,
  mrr,
}: {
  totalExpected: number
  thisMonth: number
  nextMonth: number
  activeSubscriptions: number
  mrr: number
}) {
  const tip = "Based on active subscriptions as of run date; deterministic; no growth/churn assumptions."
  return (
    <div className="grid grid-cols-5 gap-4">
      <KpiCard label="Total expected (12 mo)" value={formatCurrency(totalExpected)} tooltip={tip} />
      <KpiCard label="This month" value={formatCurrency(thisMonth)} tooltip={tip} />
      <KpiCard label="Next month" value={formatCurrency(nextMonth)} tooltip={tip} />
      <KpiCard label="Active subscriptions" value={activeSubscriptions.toLocaleString()} tooltip={tip} />
      <KpiCard label="Normalized MRR" value={formatCurrency(mrr)} tooltip="Sum of all subscriptions normalized to monthly. Stays flat with no churn/growth." />
    </div>
  )
}
