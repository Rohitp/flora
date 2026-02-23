"use client"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Info, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ForecastSettingsProps {
  basis: "invoice" | "collection"
  onBasisChange: (basis: "invoice" | "collection") => void
  settings: {
    scheduledChanges: boolean
    ramps: boolean
    discounts: boolean
    proration: boolean
    calendarBilling: boolean
    advanceInvoicing: boolean
    credits: boolean
  }
  onSettingChange: (key: string, value: boolean) => void
  onRecompute: () => void
  isComputing: boolean
}

function SettingToggle({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  tooltip?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="cursor-pointer text-xs text-card-foreground">{label}</Label>
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 cursor-help text-muted-foreground/40" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  )
}

export function ForecastSettings({
  basis,
  onBasisChange,
  settings,
  onSettingChange,
  onRecompute,
  isComputing,
}: ForecastSettingsProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-card-foreground">Forecast Settings</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Decide what billing configuration is included in the forecast.
        </p>
      </div>

      <div className="px-4 py-3">
        {/* Basis radio */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-card-foreground">Basis</p>
          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="basis"
                checked={basis === "invoice"}
                onChange={() => onBasisChange("invoice")}
                className="mt-0.5 accent-[color:var(--primary)]"
              />
              <div>
                <span className="text-xs font-medium text-card-foreground">Invoice date</span>
                <p className="text-[11px] text-muted-foreground">
                  Bucket cash in month invoice is raised.
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="basis"
                checked={basis === "collection"}
                onChange={() => onBasisChange("collection")}
                className="mt-0.5 accent-[color:var(--primary)]"
              />
              <div>
                <span className="text-xs font-medium text-card-foreground">Expected collection date</span>
                <p className="text-[11px] text-muted-foreground">
                  Payment terms shift cash into later months.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Billing config toggles */}
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-card-foreground">
            Include billing configuration
          </p>
          <div className="flex flex-col">
            <SettingToggle
              label="Scheduled changes"
              checked={settings.scheduledChanges}
              onChange={(v) => onSettingChange("scheduledChanges", v)}
            />
            <SettingToggle
              label="Ramps / price increases"
              checked={settings.ramps}
              onChange={(v) => onSettingChange("ramps", v)}
            />
            <SettingToggle
              label="Discounts & coupon expiry"
              checked={settings.discounts}
              onChange={(v) => onSettingChange("discounts", v)}
            />
            <SettingToggle
              label="Proration effects"
              checked={settings.proration}
              onChange={(v) => onSettingChange("proration", v)}
              tooltip="May increase computation time; v1 may exclude."
            />
            <SettingToggle
              label="Calendar billing dates"
              checked={settings.calendarBilling}
              onChange={(v) => onSettingChange("calendarBilling", v)}
            />
            <SettingToggle
              label="Advance invoicing"
              checked={settings.advanceInvoicing}
              onChange={(v) => onSettingChange("advanceInvoicing", v)}
            />
            <SettingToggle
              label="Credits/dues application"
              checked={settings.credits}
              onChange={(v) => onSettingChange("credits", v)}
              tooltip="If enabled, reduces expected cash based on credits."
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-card-foreground">Filters</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-muted">
              All Segments
            </Badge>
            <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-muted">
              All Plans
            </Badge>
            <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-muted">
              Monthly
            </Badge>
            <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-muted">
              Annual
            </Badge>
            <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-muted">
              Quarterly
            </Badge>
            <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-muted">
              Auto
            </Badge>
            <Badge variant="outline" className="cursor-pointer text-[11px] hover:bg-muted">
              Manual
            </Badge>
          </div>
        </div>

        {/* Recompute button */}
        <Button
          onClick={onRecompute}
          disabled={isComputing}
          className="w-full gap-2"
          size="sm"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isComputing && "animate-spin")} />
          {isComputing ? "Computing..." : "Recompute forecast"}
        </Button>
      </div>

      {!settings.proration && (
        <div className="border-t border-border bg-amber-50 px-4 py-2 dark:bg-amber-950/20">
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            Proration excluded -- totals may differ from real invoices in edge cases.
          </p>
        </div>
      )}
    </div>
  )
}
