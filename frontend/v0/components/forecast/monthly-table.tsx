"use client"

import { type MonthForecast, formatCurrency } from "@/lib/forecast-data"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MonthlyTable({
  data,
  onSelectMonth,
  selectedMonth,
  onExport,
}: {
  data: MonthForecast[]
  onSelectMonth: (monthKey: string) => void
  selectedMonth: string | null
  onExport?: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Monthly Forecast</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Click a month to explore contributing customers and subscriptions.
          </p>
        </div>
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2 border-b border-border bg-muted/40 px-5 py-2 text-xs font-medium text-muted-foreground">
        <span>Month</span>
        <span className="text-right">Total Expected</span>
        <span className="text-right">Monthly</span>
        <span className="text-right">Quarterly</span>
        <span className="text-right">Annual</span>
        <span className="text-right"># Invoices</span>
        <span className="text-right">vs prev</span>
      </div>

      <div className="divide-y divide-border">
        {data.map((row) => (
          <button
            key={row.monthKey}
            onClick={() => onSelectMonth(row.monthKey)}
            className={cn(
              "grid w-full grid-cols-7 gap-2 px-5 py-2.5 text-left text-sm transition-colors hover:bg-muted/30",
              selectedMonth === row.monthKey && "bg-primary/5 hover:bg-primary/8"
            )}
          >
            <span className="font-medium text-card-foreground">{row.month}</span>
            <span className="text-right font-semibold text-card-foreground tabular-nums">
              {formatCurrency(row.expectedCash)}
            </span>
            <span className="text-right text-muted-foreground tabular-nums text-xs">
              {formatCurrency(row.monthly)}
            </span>
            <span className="text-right text-muted-foreground tabular-nums text-xs">
              {row.quarterly > 0 ? formatCurrency(row.quarterly) : "-"}
            </span>
            <span className="text-right text-muted-foreground tabular-nums text-xs">
              {row.annual > 0 ? formatCurrency(row.annual) : "-"}
            </span>
            <span className="text-right text-muted-foreground tabular-nums text-xs">{row.invoiceCount}</span>
            <span className="flex items-center justify-end gap-1 tabular-nums">
              {row.deltaPct === null ? (
                <span className="text-xs text-muted-foreground">-</span>
              ) : row.deltaPct >= 0 ? (
                <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                  <ArrowUp className="h-3 w-3" />
                  {row.deltaPct}%
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-xs text-destructive">
                  <ArrowDown className="h-3 w-3" />
                  {Math.abs(row.deltaPct)}%
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
