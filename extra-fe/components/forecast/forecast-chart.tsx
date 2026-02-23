"use client"

import { useState, useMemo } from "react"
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts"
import { type MonthForecast, formatCurrency } from "@/lib/forecast-data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type GroupBy = "frequency" | "plan" | "family"

const FREQUENCY_COLORS: Record<string, string> = {
  Monthly: "#3b82f6",
  Quarterly: "#f59e0b",
  Annual: "#10b981",
}

const PLAN_COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899",
]

const FAMILY_COLORS: Record<string, string> = {
  "Core Platform": "#3b82f6",
  Analytics: "#f59e0b",
  "Add-ons": "#10b981",
}

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const total = payload.filter(p => p.name !== "MRR").reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-card-foreground">{label}</p>
      <p className="mb-1 text-xs text-muted-foreground">
        Total: <span className="font-semibold text-card-foreground">{formatCurrency(total)}</span>
      </p>
      <div className="flex flex-col gap-0.5">
        {payload.map((entry, i) => (
          <p key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}:{" "}
            <span className="font-medium text-card-foreground">{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
      {payload.some(p => p.name === "MRR") && (
        <p className="mt-1.5 border-t border-border pt-1.5 text-[10px] text-muted-foreground">
          MRR is normalized recurring revenue. Cash fluctuates based on billing timing.
        </p>
      )}
    </div>
  )
}

export function ForecastChart({
  data,
  horizon,
  mrr,
}: {
  data: MonthForecast[]
  horizon: number
  mrr: number
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("frequency")

  // Derive stack keys based on groupBy
  const { chartData, stackKeys, colorMap } = useMemo(() => {
    if (groupBy === "frequency") {
      const cd = data.map((m) => ({
        month: m.month,
        Monthly: m.monthly,
        Quarterly: m.quarterly,
        Annual: m.annual,
        MRR: mrr,
      }))
      return {
        chartData: cd,
        stackKeys: ["Monthly", "Quarterly", "Annual"],
        colorMap: FREQUENCY_COLORS,
      }
    }

    if (groupBy === "plan") {
      // Gather all plans, pick top 5, group rest as Others
      const planTotals: Record<string, number> = {}
      for (const m of data) {
        for (const [plan, amt] of Object.entries(m.byPlan)) {
          planTotals[plan] = (planTotals[plan] || 0) + amt
        }
      }
      const sorted = Object.entries(planTotals).sort((a, b) => b[1] - a[1])
      const top5 = sorted.slice(0, 5).map(([name]) => name)
      const keys = [...top5, "Others"]
      const colors: Record<string, string> = {}
      top5.forEach((k, i) => (colors[k] = PLAN_COLORS[i]))
      colors["Others"] = "#94a3b8"

      const cd = data.map((m) => {
        const row: Record<string, unknown> = { month: m.month }
        for (const k of top5) row[k] = m.byPlan[k] || 0
        row["Others"] = Object.entries(m.byPlan)
          .filter(([k]) => !top5.includes(k))
          .reduce((s, [, v]) => s + v, 0)
        row["MRR"] = mrr
        return row
      })
      return { chartData: cd, stackKeys: keys, colorMap: colors }
    }

    // family
    const families = ["Core Platform", "Analytics", "Add-ons"]
    const cd = data.map((m) => {
      const row: Record<string, unknown> = { month: m.month }
      for (const f of families) row[f] = m.byFamily[f] || 0
      row["MRR"] = mrr
      return row
    })
    return { chartData: cd, stackKeys: families, colorMap: FAMILY_COLORS }
  }, [data, groupBy, mrr])

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-card-foreground">
          {horizon}-Month Expected Cash Collection Trend
        </h3>
        <div className="flex items-center gap-3">
          {/* Group By selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Group by:</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frequency">Billing Frequency</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="family">Product Family</SelectItem>
              </SelectContent>
            </Select>
          </div>


        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`}
          />
          <ReTooltip content={<ChartTooltipContent />} />
          {stackKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="cash"
              fill={colorMap[key] || PLAN_COLORS[i % PLAN_COLORS.length]}
              radius={i === stackKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              animationDuration={400}
            />
          ))}
          <Line
            dataKey="MRR"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {stackKeys.map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: colorMap[key] || "#94a3b8" }}
            />
            {key}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-b-2 border-dashed border-[#ef4444]" />
          MRR ({formatCurrency(mrr)}/mo)
        </span>
      </div>

      {/* Caption */}
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        Projection from active subscriptions as of today. No growth or churn assumptions.
      </p>
    </div>
  )
}
