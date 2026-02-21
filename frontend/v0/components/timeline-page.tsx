"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Mail,
  ArrowUpRight,
  Bot,
  Pause,
  Check,
  Clock,
  X,
  Send,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Upload,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api, type Customer, type InvoiceSchedule, type ScheduledAction } from "@/lib/api"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ---- Color mapping from backend color strings to Tailwind classes ----
const nodeColor: Record<string, string> = {
  blue:   "bg-chart-1/10 text-chart-1 border-chart-1/20",
  red:    "bg-destructive/10 text-destructive border-destructive/20",
  grey:   "bg-chart-5/10 text-chart-5 border-chart-5/20",
  green:  "bg-success/10 text-success border-success/20",
  orange: "bg-amber-500/10 text-amber-600 border-amber-500/20",
}

const lineColor: Record<string, string> = {
  blue:   "bg-chart-1/30",
  red:    "bg-destructive/30",
  grey:   "bg-chart-5/30",
  green:  "bg-success/30",
  orange: "bg-amber-500/30",
}

const statusBadgeColor: Record<string, string> = {
  sent:      "bg-chart-1/10 text-chart-1 border-chart-1/20",
  pending:   "bg-chart-3/10 text-chart-3 border-chart-3/20",
  paused:    "bg-amber-500/10 text-amber-600 border-amber-500/20",
  cancelled: "bg-muted text-muted-foreground/60 border-border",
  completed: "bg-success/10 text-success border-success/20",
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed": return <Check className="h-3.5 w-3.5" />
    case "sent":      return <Send className="h-3.5 w-3.5" />
    case "pending":   return <Clock className="h-3.5 w-3.5" />
    case "paused":    return <Pause className="h-3.5 w-3.5" />
    case "cancelled": return <X className="h-3.5 w-3.5" />
    default:          return <Clock className="h-3.5 w-3.5" />
  }
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "escalation") return <ArrowUpRight className={cn("h-4 w-4", className)} />
  return <Mail className={cn("h-4 w-4", className)} />
}

function TimelineNode({ action, isLast }: { action: ScheduledAction; isLast: boolean }) {
  const isDueDate = action.day_offset === 0
  const color = action.color || "blue"
  const isPaused = action.status === "paused"
  const isCancelled = action.status === "cancelled"
  const ruleType = action.rule_id ? "email" : "escalation"

  return (
    <div className="relative flex gap-6">
      <div className="flex flex-col items-center">
        <div className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all",
          isDueDate
            ? "h-12 w-12 border-chart-3 bg-chart-3/10 text-chart-3 ring-4 ring-chart-3/10"
            : action.ai_generated
              ? "border-dashed border-violet-400/60 bg-violet-50 text-violet-500"
              : nodeColor[color] ?? nodeColor.blue,
        )}>
          {action.ai_generated
            ? <Sparkles className="h-4 w-4" />
            : isPaused
              ? <Pause className="h-4 w-4" />
              : <TypeIcon type={ruleType} />
          }
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 flex-1 min-h-6",
            isPaused || isCancelled ? "bg-border" : lineColor[color] ?? lineColor.blue,
          )} />
        )}
      </div>

      <div className="flex-1 pb-8">
        <div className={cn(
          "rounded-xl border p-4 transition-all hover:shadow-sm",
          isDueDate
            ? "border-chart-3/30 bg-chart-3/5"
            : isPaused
              ? "border-l-4 border-l-amber-500 border-y border-r border-border bg-muted/40"
              : action.ai_generated
                ? "border-2 border-dashed border-violet-300/50 bg-violet-50/50"
                : "border-border bg-card",
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  "text-sm font-semibold text-foreground",
                  (isPaused || isCancelled) && "line-through text-muted-foreground",
                )}>
                  {action.action_name}
                </h3>
                {action.ai_generated && (
                  <Badge variant="outline" className="border-violet-300/40 bg-violet-100 text-[9px] font-medium text-violet-600">
                    <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                    AI Added
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{action.scheduled_date}</span>
                <Badge variant="outline" className={cn(
                  "text-[10px] font-medium",
                  action.audience === "Customer"
                    ? "border-chart-1/20 bg-chart-1/5 text-chart-1"
                    : "border-chart-5/20 bg-chart-5/5 text-chart-5",
                )}>
                  {action.audience}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] font-medium", statusBadgeColor[action.status] ?? statusBadgeColor.pending)}>
                  <StatusIcon status={action.status} />
                  <span className="ml-1 capitalize">{action.status}</span>
                </Badge>
                {action.day_offset !== 0 && (
                  <span className={cn(
                    "font-mono text-[11px] font-medium",
                    action.day_offset < 0 ? "text-chart-1" : "text-destructive",
                  )}>
                    {action.day_offset > 0 ? "+" : ""}{action.day_offset}d
                  </span>
                )}
                {isDueDate && <span className="font-mono text-[11px] font-bold text-chart-3">DUE DATE</span>}
              </div>
            </div>
          </div>

          {isPaused && !action.ai_generated && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-2.5 text-xs text-amber-600">
              <Pause className="h-3.5 w-3.5 shrink-0" />
              {action.note ?? "Paused — payment commitment received"}
            </div>
          )}

          {action.note && !isPaused && (
            <div className={cn(
              "mt-3 flex items-center gap-2 rounded-lg p-2.5 text-xs",
              action.ai_generated
                ? "bg-violet-50 text-violet-700 border border-violet-200"
                : "bg-muted text-muted-foreground",
            )}>
              {action.ai_generated ? <Sparkles className="h-3.5 w-3.5 shrink-0" /> : <Bot className="h-3.5 w-3.5 shrink-0" />}
              {action.note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Empty state with drag-and-drop upload ----
function EmptyState({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      await api.rules.upload(file)
      onUploaded()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [onUploaded])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="flex h-full flex-col items-center justify-center px-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full max-w-lg cursor-pointer flex-col items-center gap-5 rounded-2xl border-2 border-dashed p-12 transition-all",
          dragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border bg-card hover:border-primary/50 hover:bg-muted/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        <div className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
          dragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {uploading
            ? <div className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : dragging
              ? <Upload className="h-7 w-7" />
              : <FileText className="h-7 w-7" />
          }
        </div>

        <div className="text-center">
          <p className="text-base font-semibold text-foreground">
            {uploading ? "AI is reading your rules…" : dragging ? "Drop to upload" : "Drop your rules file here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {uploading
              ? "Claude is parsing your rules and computing schedules for all customers"
              : "CSV, Excel, or plain text — the AI will figure it out"}
          </p>
        </div>

        {!uploading && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2">
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">or click to browse</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        5 customers are ready — upload rules to generate their collection timelines
      </p>
    </div>
  )
}

// ---- Main page ----
export function TimelinePage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [schedule, setSchedule] = useState<InvoiceSchedule | null>(null)
  const [hasRules, setHasRules] = useState<boolean | null>(null) // null = loading
  const [loading, setLoading] = useState(false)

  const checkRulesAndLoad = useCallback(async () => {
    try {
      const [rules, customerList] = await Promise.all([
        api.rules.list(),
        api.customers.list(),
      ])
      setHasRules(rules.length > 0)
      setCustomers(customerList)
      if (customerList.length > 0 && selectedCustomerId === null) {
        setSelectedCustomerId(customerList[0].id)
      }
    } catch {
      setHasRules(false)
    }
  }, [selectedCustomerId])

  useEffect(() => { checkRulesAndLoad() }, [checkRulesAndLoad])

  useEffect(() => {
    if (selectedCustomerId === null || !hasRules) return
    setLoading(true)
    const customer = customers.find(c => c.id === selectedCustomerId)
    if (!customer?.invoices[0]) { setLoading(false); return }
    api.invoices.schedule(customer.invoices[0].id)
      .then(s => { setSchedule(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedCustomerId, hasRules, customers])

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
  const invoice = schedule?.invoice ?? selectedCustomer?.invoices[0]
  const aiModified = schedule?.scheduled_actions.some(a => a.ai_generated) ?? false

  // Loading state
  if (hasRules === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Empty state — no rules uploaded yet
  if (!hasRules) {
    return <EmptyState onUploaded={() => { setHasRules(null); checkRulesAndLoad() }} />
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedCustomer && (
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-card",
                selectedCustomer.color,
              )}>
                {selectedCustomer.initials}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {selectedCustomer?.name ?? "—"}
              </h1>
              <div className="mt-0.5 flex items-center gap-3">
                {invoice && (
                  <>
                    <span className="text-sm font-semibold text-destructive">
                      {formatCurrency(selectedCustomer?.total_outstanding ?? invoice.amount)} outstanding
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px] border-border">
                      {invoice.invoice_number}
                    </Badge>
                    {invoice.days_overdue && invoice.days_overdue > 0 && (
                      <Badge variant="outline" className="text-[11px] border-destructive/20 bg-destructive/10 text-destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {invoice.days_overdue}d overdue
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <select
            value={selectedCustomerId ?? ""}
            onChange={e => setSelectedCustomerId(Number(e.target.value))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AI modification banner */}
      {aiModified && (
        <div className="flex items-center justify-between border-b border-border bg-indigo-50/60 px-8 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs text-indigo-700">Schedule modified by AI agent</span>
          </div>
          <a href="/inbox" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
            View Inbox Thread <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : schedule && schedule.scheduled_actions.length > 0 ? (
            <>
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground">Collection Timeline</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Showing all scheduled and completed actions for {invoice?.invoice_number}
                </p>
              </div>
              {schedule.scheduled_actions.map((action, i) => (
                <TimelineNode
                  key={action.id}
                  action={action}
                  isLast={i === schedule.scheduled_actions.length - 1}
                />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No schedule yet for this customer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
