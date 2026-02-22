"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Upload, Mail, ArrowUpRight, Users, Building, CheckCircle2, Bot, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api, type Rule } from "@/lib/api"

function DayBadge({ days }: { days: number }) {
  const label = days === 0 ? "Due date" : days < 0 ? `${days}d` : `+${days}d`
  const color =
    days < 0   ? "bg-chart-1/10 text-chart-1 border-chart-1/20" :
    days === 0 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" :
    days <= 15 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" :
                 "bg-destructive/10 text-destructive border-destructive/20"
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] font-medium", color)}>{label}</Badge>
  )
}

function AudienceBadge({ audience }: { audience: string }) {
  return (
    <Badge variant="outline" className={cn(
      "text-[11px] font-medium",
      audience === "Customer"
        ? "border-chart-1/20 bg-chart-1/5 text-chart-1"
        : "border-chart-5/20 bg-chart-5/5 text-chart-5",
    )}>
      {audience === "Customer" ? <Users className="mr-1 h-3 w-3" /> : <Building className="mr-1 h-3 w-3" />}
      {audience}
    </Badge>
  )
}

function RuleRow({ rule }: { rule: Rule }) {
  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/40">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            rule.type === "email" ? "bg-chart-1/10 text-chart-1" : "bg-chart-5/10 text-chart-5",
          )}>
            {rule.type === "email" ? <Mail className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          </div>
          <span className={cn("text-sm font-medium", rule.status === "paused" ? "text-muted-foreground" : "text-foreground")}>
            {rule.name}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5"><DayBadge days={rule.day_offset} /></td>
      <td className="px-5 py-3.5"><AudienceBadge audience={rule.audience} /></td>
      <td className="px-5 py-3.5"><span className="text-sm text-muted-foreground">{rule.frequency}</span></td>
      <td className="px-5 py-3.5">
        <Badge variant="outline" className={cn(
          "text-[11px]",
          rule.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border",
        )}>
          {rule.status}
        </Badge>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs text-muted-foreground">
          {new Date(rule.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-muted-foreground"><Minus className="inline h-3.5 w-3.5" /></span>
      </td>
    </tr>
  )
}

export function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadedAt, setUploadedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadRules = useCallback(async () => {
    const loaded = await api.rules.list()
    setRules(loaded)
    if (loaded.length > 0 && !uploadedAt) {
      setUploadedAt(loaded[0].created_at)
    }
  }, [uploadedAt])

  useEffect(() => { loadRules() }, [loadRules])

  const handleFile = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      await api.rules.upload(file)
      await loadRules()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const customerFacing = rules.filter(r => r.audience === "Customer").length
  const internalCount  = rules.filter(r => r.audience === "Internal").length

  const uploadedAtFormatted = uploadedAt
    ? new Date(uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Automations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure collection automation rules and schedules</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-8 py-6">
          {/* Upload bar */}
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/20 px-5 py-3">
            <div className="flex items-center gap-2.5">
              {rules.length > 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm text-foreground font-medium">{rules.length} rules loaded</span>
                  {uploadedAtFormatted && (
                    <span className="text-xs text-muted-foreground">— last updated {uploadedAtFormatted}</span>
                  )}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">No rules loaded — upload a file to get started</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {error && <span className="text-xs text-destructive">{error}</span>}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Upload className="mr-1.5 inline h-3 w-3" />
                {uploading ? "Fora is reading…" : rules.length > 0 ? "Replace File" : "Upload Rules"}
              </button>
            </div>
          </div>

          {/* Rules table */}
          {rules.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Rule", "Day Offset", "Audience", "Frequency", "Status", "Created", "AI Overrides"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => <RuleRow key={rule.id} rule={rule} />)}
                </tbody>
              </table>
            </div>
          )}

          {rules.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card px-5 py-3.5">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{rules.length}</span> rules loaded
                {" · "}
                <span className="font-semibold text-foreground">{customerFacing}</span> customer-facing
                {" · "}
                <span className="font-semibold text-foreground">{internalCount}</span> internal escalations
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
