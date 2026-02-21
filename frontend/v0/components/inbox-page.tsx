"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, Send, ArrowRight, Bot, Pause, MoreHorizontal,
  Sparkles, X, CalendarClock, Mail, RefreshCw, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api, type InboxMessage, type Customer } from "@/lib/api"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const INTENT_STYLES: Record<string, { label: string; color: string }> = {
  will_pay_later: { label: "Will Pay Later",  color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  already_paid:   { label: "Already Paid",    color: "bg-success/10 text-success border-success/20" },
  disputed:       { label: "Disputed",         color: "bg-destructive/10 text-destructive border-destructive/20" },
  unclear:        { label: "Unclassified",     color: "bg-muted text-muted-foreground border-border" },
}

const STATUS_TABS = ["open", "classified", "needs_review", "closed"] as const
type Tab = typeof STATUS_TABS[number] | "all"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ---- Thread list ----
function ThreadList({
  messages, selectedId, onSelect, filter, onFilterChange,
}: {
  messages: InboxMessage[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: Tab
  onFilterChange: (f: Tab) => void
}) {
  const [search, setSearch] = useState("")

  const counts = STATUS_TABS.reduce((acc, s) => {
    acc[s] = messages.filter(m => m.status === s).length
    return acc
  }, {} as Record<string, number>)

  const filtered = messages.filter(m => {
    const matchStatus = filter === "all" || m.status === filter
    const matchSearch = !search ||
      (m.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-r border-border bg-card">
      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2.5 flex-wrap">
        {(["all", ...STATUS_TABS] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => onFilterChange(tab)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors capitalize",
              filter === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab !== "all" && (
              <span className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold",
                filter === tab ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>
                {counts[tab] ?? 0}
              </span>
            )}
            {tab === "all" ? "All" : tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search threads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Mail className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Send an email to your demo Gmail address or use the simulator below
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(msg => {
              const intent = msg.intent ? INTENT_STYLES[msg.intent] : null
              return (
                <button
                  key={msg.id}
                  onClick={() => onSelect(msg.ticket_id)}
                  className={cn(
                    "relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                    selectedId === msg.ticket_id ? "bg-muted/80" : "hover:bg-muted/40",
                    msg.status === "open" && "border-l-2 border-l-accent",
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-card",
                    msg.customer_color ?? "bg-slate-500",
                  )}>
                    {msg.customer_initials ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {msg.customer_name ?? msg.from_email}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(msg.received_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{msg.subject}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {msg.invoice_number && (
                        <Badge variant="outline" className="h-5 rounded-md border-border bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                          {msg.invoice_number}
                        </Badge>
                      )}
                      {msg.thread_count > 1 && (
                        <Badge variant="outline" className="h-5 rounded-md border-border bg-muted/80 px-1.5 text-[10px] font-medium text-muted-foreground">
                          {msg.thread_count} msgs
                        </Badge>
                      )}
                      {intent && (
                        <Badge variant="outline" className={cn("h-5 rounded-md px-1.5 text-[10px] font-medium", intent.color)}>
                          {intent.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {msg.draft_reply && (
                    <Sparkles className="absolute right-3 top-3 h-3.5 w-3.5 text-accent" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ---- Email detail view ----
function EmailView({
  message, onReply, onClose,
}: {
  message: InboxMessage
  onReply: (ticketId: string, body?: string) => Promise<void>
  onClose: () => void
}) {
  const [draftText, setDraftText] = useState(message.draft_reply ?? "")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    setDraftText(message.draft_reply ?? "")
    setSent(false)
  }, [message.id, message.draft_reply])

  const intent = message.intent ? INTENT_STYLES[message.intent] : null

  const handleSend = async () => {
    setSending(true)
    await onReply(message.ticket_id, draftText)
    setSending(false)
    setSent(true)
  }

  const actionLines = message.action_summary
    ? message.action_summary.split(";").map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div className="flex h-full flex-1 flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{message.subject}</h2>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {message.invoice_number && (
              <Badge variant="outline" className="font-mono text-[11px] border-border">
                {message.invoice_number}
              </Badge>
            )}
            {intent && (
              <Badge variant="outline" className={cn("text-[11px] font-medium", intent.color)}>
                {intent.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onClose}>
            <X className="h-3 w-3" />
            Close
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          {/* Email body */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{message.from_email}</span>
                <ArrowRight className="h-3 w-3" />
                <span>collections@demo.com</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(message.received_at).toLocaleString()}
              </span>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message.body}
            </div>
          </div>

          {/* AI actions taken */}
          {actionLines.length > 0 && (
            <div className="rounded-xl border-l-4 border-l-accent border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Pause className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">AI Agent — Actions Taken</p>
                    <Badge variant="outline" className="border-accent/20 bg-accent/10 text-[10px] font-medium text-accent">
                      <Bot className="mr-1 h-3 w-3" />AI Agent
                    </Badge>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    {message.intent_summary && (
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                        Classified intent: {intent?.label ?? message.intent}
                        {message.confidence && ` (${Math.round(message.confidence * 100)}% confidence)`}
                      </li>
                    )}
                    {actionLines.map((line, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* AI draft reply */}
      {draftText && !sent && (
        <div className="border-t border-border bg-accent/5 px-6 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">AI-suggested reply</span>
          </div>
          <textarea
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-accent/20 bg-card p-3 text-xs leading-relaxed text-foreground outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setDraftText(message.draft_reply ?? "")}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Reset
            </button>
            <div className="flex-1" />
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleSend}
              disabled={sending}
            >
              <Send className="h-3 w-3" />
              {sending ? "Sending…" : "Send Reply"}
            </Button>
          </div>
        </div>
      )}

      {sent && (
        <div className="border-t border-border bg-success/5 px-6 py-4">
          <p className="text-sm font-medium text-success">Reply sent to {message.from_email}</p>
        </div>
      )}
    </div>
  )
}

// ---- Customer context panel ----
function CustomerPanel({ message, customers }: { message: InboxMessage; customers: Customer[] }) {
  const customer = customers.find(c => c.id === message.customer_id)

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex flex-col items-center border-b border-border px-6 py-6">
        <div className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-card",
          message.customer_color ?? "bg-slate-500",
        )}>
          {message.customer_initials ?? "?"}
        </div>
        <h3 className="mt-3 text-base font-semibold text-foreground">
          {message.customer_name ?? message.from_email}
        </h3>
        {customer && (
          <>
            <p className="mt-1 text-sm text-accent">{customer.invoices.length} invoice(s)</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(customer.total_outstanding)}</p>
          </>
        )}
      </div>

      {customer && customer.invoices.length > 0 && (
        <div className="border-b border-border px-5 py-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Invoices</h4>
          <div className="mt-3 space-y-2">
            {customer.invoices.filter(i => i.status !== "resolved").map(inv => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-mono text-sm font-medium text-foreground">{inv.invoice_number}</p>
                  <p className="text-[11px] text-muted-foreground">Due: {inv.due_date}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(inv.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {customer?.settings && customer.settings.filter(s => s.key === "agent_notes").length > 0 && (
        <div className="px-5 py-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Notes</h4>
          {customer.settings.filter(s => s.key === "agent_notes").map(s => (
            <p key={s.id} className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.value}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Simulator panel ----
function SimulatorPanel({
  customers, onSimulated,
}: {
  customers: Customer[]
  onSimulated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customers.length > 0 && customerId === null) {
      setCustomerId(customers[0].id)
    }
  }, [customers, customerId])

  const handleSimulate = async () => {
    if (!customerId || !body.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.inbox.simulate(customerId, body)
      setBody("")
      setOpen(false)
      onSimulated()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Simulation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" />
          Simulate customer message
        </div>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <select
            value={customerId ?? ""}
            onChange={e => setCustomerId(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="e.g. I'll pay next Friday, cash is tight this month"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={handleSimulate}
            disabled={loading || !body.trim()}
          >
            <Zap className="h-3.5 w-3.5" />
            {loading ? "Processing…" : "Run through AI pipeline"}
          </Button>
        </div>
      )}
    </div>
  )
}

// ---- Main page ----
export function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Tab>("all")

  const fetchAll = useCallback(async () => {
    const [msgs, custs] = await Promise.all([
      api.inbox.list(),
      api.customers.list(),
    ])
    setMessages(msgs)
    setCustomers(custs)
    // Auto-select first message if none selected
    if (msgs.length > 0 && selectedId === null) {
      setSelectedId(msgs[0].ticket_id)
    }
  }, [selectedId])

  useEffect(() => {
    fetchAll()
    // Poll every 10 seconds
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleReply = async (ticketId: string, body?: string) => {
    await api.inbox.sendReply(ticketId, body)
    fetchAll()
  }

  const handleClose = () => {
    // Just deselect
    setSelectedId(messages.find(m => m.ticket_id !== selectedId)?.ticket_id ?? null)
  }

  const selectedMessage = messages.find(m => m.ticket_id === selectedId)

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Thread list + simulator */}
      <div className="flex h-full flex-col" style={{ width: 360 }}>
        <div className="flex-1 min-h-0">
          <ThreadList
            messages={messages}
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
        <SimulatorPanel customers={customers} onSimulated={fetchAll} />
      </div>

      {/* Email view */}
      {selectedMessage ? (
        <>
          <EmailView message={selectedMessage} onReply={handleReply} onClose={handleClose} />
          <CustomerPanel message={selectedMessage} customers={customers} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Mail className="mx-auto h-10 w-10 opacity-20" />
            <p className="mt-3 text-sm">Select a message or send an email to your demo address</p>
          </div>
        </div>
      )}
    </div>
  )
}
