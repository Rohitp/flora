"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Settings2, ArrowRight, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { ReceivablesTransition } from "@/components/receivables-transition"
import { computeForecast } from "@/lib/forecast-data"
import { KpiStrip } from "@/components/forecast/kpi-strip"
import { ForecastChart } from "@/components/forecast/forecast-chart"
import { MonthlyTable } from "@/components/forecast/monthly-table"
import { MonthDrilldown } from "@/components/forecast/month-drilldown"
import { ForecastSettings } from "@/components/forecast/forecast-settings"
import { ExportModal } from "@/components/forecast/export-modal"

export default function CollectionForecastPage() {
  const [horizon, setHorizon] = useState<12 | 24>(12)
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

  // Compute forecast only on client to avoid hydration mismatch from Date operations
  useEffect(() => {
    setForecast(computeForecast(horizon, basis))
  }, [horizon, basis])

  const selectedMonthData = !forecast ? null : selectedMonth
    ? forecast.monthlyForecasts.find((m) => m.monthKey === selectedMonth) ?? null
    : null

  // Find the upcoming billing spike month from actual forecast data
  const spikeMonth = useMemo(() => {
    if (!forecast) return null
    const months = forecast.monthlyForecasts
    if (months.length < 2) return null
    const avg = months.reduce((s, m) => s + m.expectedCash, 0) / months.length
    const spike = months.find((m) => m.expectedCash > avg * 1.3)
    return spike ?? null
  }, [forecast])

  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [showTransition, setShowTransition] = useState(false)

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

          {/* Contextual Receivables nudge */}
          <div className="rounded-xl border border-primary/10 bg-[hsl(225,30%,97%)] px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              {/* LEFT: Content */}
              <div className="max-w-xl">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {"Cash forecast \u2260 Cash collected"}
                </p>
                <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                  Make sure this forecast turns into real cash.
                </h3>

                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    "Reduce overdue invoices",
                    "Automate follow-ups",
                    "Improve cash recovery rates",
                    "Get visibility into at-risk revenue",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                      {item}
                    </li>
                  ))}
                </ul>

              </div>

              {/* RIGHT: CTA + contextual info */}
              <div className="flex shrink-0 flex-col items-end gap-2 lg:pt-6">
                <Button size="sm" className="gap-1.5 text-xs shadow-sm" onClick={() => setShowTransition(true)}>
                  Explore Receivables
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                {spikeMonth && (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                    <AlertCircle className="h-3 w-3 text-primary/50" />
                    Upcoming spike in {spikeMonth.month} increases collection risk.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Deterministic footer */}
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
              allEvents={forecast.allEvents}
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

      {/* How it works modal */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">How Receivables Works</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              {
                step: "1",
                title: "Forecast",
                desc: "Identify when cash is expected from active subscriptions.",
              },
              {
                step: "2",
                title: "Detect At-Risk",
                desc: "Flag invoices likely to be late based on customer history and payment patterns.",
              },
              {
                step: "3",
                title: "Automate Recovery",
                desc: "Trigger reminders, dunning sequences, and escalation workflows automatically.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setShowHowItWorks(false); setShowTransition(true) }}>
              Explore Receivables
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceivablesTransition active={showTransition} onDone={() => setShowTransition(false)} />
    </div>
  )
}
