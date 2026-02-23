"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { computeForecast } from "@/lib/forecast-data"
import { KpiStrip } from "@/components/forecast/kpi-strip"
import { ForecastChart } from "@/components/forecast/forecast-chart"
import { MonthlyTable } from "@/components/forecast/monthly-table"
import { MonthDrilldown } from "@/components/forecast/month-drilldown"
import { ForecastSettings } from "@/components/forecast/forecast-settings"
import { ExportModal } from "@/components/forecast/export-modal"

export default function CollectionForecastPage() {
  const [horizon] = useState<12 | 24>(12)
  const [basis, setBasis] = useState<"invoice" | "collection">("collection")
  const [isComputing, setIsComputing] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    scheduledChanges: true,
    ramps: true,
    discounts: true,
    proration: false,
    calendarBilling: true,
    advanceInvoicing: true,
    credits: false,
  })

  const [forecast, setForecast] = useState<ReturnType<typeof computeForecast> | null>(null)

  useEffect(() => {
    setForecast(computeForecast(horizon, basis))
  }, [horizon, basis])

  const selectedMonthData = !forecast ? null : selectedMonth
    ? forecast.monthlyForecasts.find((m) => m.monthKey === selectedMonth) ?? null
    : null

  const spikeMonth = useMemo(() => {
    if (!forecast) return null
    const months = forecast.monthlyForecasts
    if (months.length < 2) return null
    const avg = months.reduce((s, m) => s + m.expectedCash, 0) / months.length
    const spike = months.find((m) => m.expectedCash > avg * 1.3)
    return spike ?? null
  }, [forecast])

  const handleRecompute = useCallback(() => {
    setIsComputing(true)
    setSelectedMonth(null)
    setTimeout(() => setIsComputing(false), 1200)
  }, [])

  const handleSettingChange = useCallback((key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Collection Forecast
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Deterministic monthly cash collection forecast from currently active subscriptions.
          </p>
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSettings(true)}
              >
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">Forecast Settings</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Forecast Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main content */}
      {!forecast || isComputing ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <KpiStrip
            totalExpected={forecast.totalExpected}
            thisMonth={forecast.thisMonthExpected}
            nextMonth={forecast.nextMonthExpected}
            activeSubscriptions={forecast.activeSubscriptions}
            mrr={forecast.mrr}
          />

          <ForecastChart
            data={forecast.monthlyForecasts}
            horizon={horizon}
            mrr={forecast.mrr}
          />

          <MonthlyTable
            data={forecast.monthlyForecasts}
            onSelectMonth={setSelectedMonth}
            selectedMonth={selectedMonth}
            onExport={() => setShowExport(true)}
          />

          {spikeMonth && (
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Note: An upcoming billing spike in {spikeMonth.month} may increase collection risk. Consider proactive outreach for at-risk accounts.
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            This forecast is computed deterministically from currently active subscriptions and their renewal schedules. It excludes new sales, churn, payment failures, and manual overrides.
          </p>
        </div>
      )}

      {/* Month drilldown sheet */}
      <Sheet open={!!selectedMonthData} onOpenChange={(open) => { if (!open) setSelectedMonth(null) }}>
        <SheetContent side="right" className="w-[480px] overflow-y-auto p-0 sm:max-w-[480px]">
          {selectedMonthData && (
            <MonthDrilldown
              monthData={selectedMonthData}
              allEvents={forecast!.allEvents}
              basis={basis}
              onClose={() => setSelectedMonth(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Forecast settings sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-[420px] overflow-y-auto p-4 sm:max-w-[420px]">
          <ForecastSettings
            basis={basis}
            onBasisChange={setBasis}
            settings={settings}
            onSettingChange={handleSettingChange}
            onRecompute={handleRecompute}
            isComputing={isComputing}
          />
        </SheetContent>
      </Sheet>

      {/* Export modal */}
      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
    </div>
  )
}
