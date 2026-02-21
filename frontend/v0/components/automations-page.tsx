"use client"

import { useState } from "react"
import {
  Upload,
  Mail,
  ArrowUpRight,
  Users,
  Building,
  CheckCircle2,
  Bot,
  Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { automationRules, type AutomationRule } from "@/lib/data"

// AI override counts per rule (matching order of automationRules)
const aiOverrideCounts: Record<string, number> = {
  r1: 3,
  r2: 1,
  r3: 5,
  r4: 4,
  r5: 2,
  r6: 2,
  r7: 1,
  r8: 3,
  r9: 0,
  r10: 0,
  r11: 0,
  r12: 0,
}

const totalAIOverrides = Object.values(aiOverrideCounts).reduce((a, b) => a + b, 0)

function DayBadge({ days }: { days: number }) {
  const label =
    days === 0 ? "Due date" : days < 0 ? `${days}d` : `+${days}d`
  const color =
    days < 0
      ? "bg-chart-1/10 text-chart-1 border-chart-1/20"
      : days === 0
      ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
      : days <= 15
      ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
      : "bg-destructive/10 text-destructive border-destructive/20"

  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] font-medium", color)}>
      {label}
    </Badge>
  )
}

function AudienceBadge({ audience }: { audience: "Customer" | "Internal" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium",
        audience === "Customer"
          ? "border-chart-1/20 bg-chart-1/5 text-chart-1"
          : "border-chart-5/20 bg-chart-5/5 text-chart-5"
      )}
    >
      {audience === "Customer" ? (
        <Users className="mr-1 h-3 w-3" />
      ) : (
        <Building className="mr-1 h-3 w-3" />
      )}
      {audience}
    </Badge>
  )
}

function RuleRow({ rule, onToggle }: { rule: AutomationRule; onToggle: () => void }) {
  const overrideCount = aiOverrideCounts[rule.id] ?? 0

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/40">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              rule.type === "email"
                ? "bg-chart-1/10 text-chart-1"
                : "bg-chart-5/10 text-chart-5"
            )}
          >
            {rule.type === "email" ? (
              <Mail className="h-4 w-4" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              rule.status === "paused"
                ? "text-muted-foreground"
                : "text-foreground"
            )}
          >
            {rule.name}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <DayBadge days={rule.dayOffset} />
      </td>
      <td className="px-5 py-3.5">
        <AudienceBadge audience={rule.audience} />
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-muted-foreground">{rule.frequency}</span>
      </td>
      <td className="px-5 py-3.5">
        <Switch
          checked={rule.status === "active"}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-success"
        />
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs text-muted-foreground">
          {rule.lastUpdated}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {overrideCount > 0 ? (
          <div className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm tabular-nums text-muted-foreground">{overrideCount}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            <Minus className="inline h-3.5 w-3.5" />
          </span>
        )}
      </td>
    </tr>
  )
}

export function AutomationsPage() {
  console.log("[v0] AutomationsPage rendering")
  const [rules, setRules] = useState(automationRules)

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "active" ? "paused" as const : "active" as const }
          : r
      )
    )
  }

  const customerFacing = rules.filter((r) => r.audience === "Customer").length
  const internalCount = rules.filter((r) => r.audience === "Internal").length

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Automations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure collection automation rules and schedules
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-8 py-6">
          {/* Loaded state bar */}
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/20 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground font-medium">
                10 rules loaded
              </span>
              <span className="text-xs text-muted-foreground">
                — last updated 20-Feb-2026
              </span>
            </div>
            <button className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
              <Upload className="mr-1.5 inline h-3 w-3" />
              Replace File
            </button>
          </div>

          {/* Table */}
          {rules.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rule
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Day Offset
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Audience
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Frequency
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Updated
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      AI Overrides
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onToggle={() => toggleRule(rule.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary bar */}
          {rules.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card px-5 py-3.5">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{rules.length}</span> rules loaded
                {" · "}
                <span className="font-semibold text-foreground">{customerFacing}</span> customer-facing
                {" · "}
                <span className="font-semibold text-foreground">{internalCount}</span> internal escalations
                {" · "}
                <span className="font-semibold text-foreground">{totalAIOverrides}</span> total AI overrides
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
