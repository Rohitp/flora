"use client"

import { useState } from "react"
import {
  Search,
  Send,
  ArrowRight,
  Bot,
  Pause,
  MoreHorizontal,
  Sparkles,
  X,
  CalendarClock,
  Mail,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { threads, customers, type EmailThread, type ThreadStatus } from "@/lib/data"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

type FilterTab = "all" | ThreadStatus

const statusTabs: { label: string; value: FilterTab; count: number }[] = [
  { label: "Open", value: "open", count: threads.filter((t) => t.status === "open").length },
  { label: "P2P", value: "p2p", count: threads.filter((t) => t.status === "p2p").length },
  { label: "Dispute", value: "dispute", count: threads.filter((t) => t.status === "dispute").length },
  { label: "Bounced", value: "bounced", count: threads.filter((t) => t.status === "bounced").length },
  { label: "Closed", value: "closed", count: threads.filter((t) => t.status === "closed").length },
]

// Intent badges per thread
const threadIntents: Record<string, { label: string; color: string }> = {
  t1: { label: "Payment Extension", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  t4: { label: "Unclassified", color: "bg-muted text-muted-foreground border-border" },
  t6: { label: "Overdue Acknowledged", color: "bg-chart-1/10 text-chart-1 border-chart-1/20" },
  t8: { label: "Payment on the Way", color: "bg-success/10 text-success border-success/20" },
  t9: { label: "Unclassified", color: "bg-muted text-muted-foreground border-border" },
}

// Threads that the agent has already acted on
const agentActedThreads = new Set(["t8", "t6"])

function ThreadList({
  threads: threadsList,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: {
  threads: EmailThread[]
  selectedId: string
  onSelect: (id: string) => void
  filter: FilterTab
  onFilterChange: (f: FilterTab) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = threadsList.filter((t) => {
    const matchesStatus = filter === "all" || t.status === filter
    const matchesSearch =
      !searchQuery ||
      t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-r border-border bg-card">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2.5">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold",
              filter === tab.value
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {tab.count}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI Toggle + Search */}
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch id="ai-toggle" />
            <label
              htmlFor="ai-toggle"
              className="text-xs font-medium text-muted-foreground"
            >
              AI Recommendations
            </label>
          </div>
          <select className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
            <option>Anytime</option>
            <option>Today</option>
            <option>This week</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filtered.map((thread) => {
            const intent = threadIntents[thread.id]
            const hasAgentActed = agentActedThreads.has(thread.id)
            return (
              <button
                key={thread.id}
                onClick={() => onSelect(thread.id)}
                className={cn(
                  "relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                  selectedId === thread.id
                    ? "bg-muted/80"
                    : "hover:bg-muted/40",
                  thread.unread && "border-l-2 border-l-accent"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-card",
                    thread.color
                  )}
                >
                  {thread.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        thread.unread ? "font-semibold text-foreground" : "font-medium text-foreground"
                      )}
                    >
                      {thread.company}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {thread.timeAgo}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {thread.subject}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {thread.invoiceIds.length > 0 ? (
                      thread.invoiceIds.length > 1 ? (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-md border-border bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
                        >
                          {thread.invoiceIds.length} Invoices
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-md border-border bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
                        >
                          {thread.invoiceIds[0]}
                        </Badge>
                      )
                    ) : null}
                    {intent && (
                      <Badge
                        variant="outline"
                        className={cn("h-5 rounded-md px-1.5 text-[10px] font-medium", intent.color)}
                      >
                        {intent.label}
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Agent sparkle indicator */}
                {hasAgentActed && (
                  <Sparkles className="absolute right-3 top-3 h-3.5 w-3.5 text-accent" />
                )}
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function EmailView({ thread }: { thread: EmailThread }) {
  const [replyText, setReplyText] = useState("")

  const isVertexThread = thread.id === "t8"

  const aiDraft =
    thread.status === "open" && thread.invoiceIds.length > 0
      ? `Thank you for your message regarding ${thread.invoiceIds.join(", ")}. I've noted your request and will have our team review it promptly. We'll get back to you within 1 business day with an update.\n\nBest regards,\nCollections Team`
      : null

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {thread.subject}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            {thread.invoiceIds.map((id) => (
              <Badge
                key={id}
                variant="outline"
                className="font-mono text-[11px] border-border"
              >
                {id}
              </Badge>
            ))}
            {thread.totalAmount > 0 && (
              <span className="text-sm font-semibold text-accent">
                {formatCurrency(thread.totalAmount)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <X className="h-3 w-3" />
            Close thread
          </Button>
        </div>
      </div>

      {/* Emails */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          {thread.emails.map((email) => (
            <div
              key={email.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {email.from}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{email.to}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {email.date}
                </span>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {email.body}
              </div>
            </div>
          ))}

          {/* AI Action Banner - enhanced */}
          {thread.status === "open" && thread.invoiceIds.length > 0 && (
            <div className="rounded-xl border-l-4 border-l-accent border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Pause className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">
                      AI Agent — Actions Taken
                    </p>
                    <Badge
                      variant="outline"
                      className="border-accent/20 bg-accent/10 text-[10px] font-medium text-accent"
                    >
                      <Bot className="mr-1 h-3 w-3" />
                      AI Agent
                    </Badge>
                  </div>
                  {isVertexThread ? (
                    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                        Classified intent: Payment on the way
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                        Paused 3 pending reminders for IN-1041
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                        Follow-up check scheduled for February 24, 2026
                      </li>
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      AI detected a payment commitment. Follow-up scheduled if not received.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* AI Draft */}
      {aiDraft && (
        <div className="border-t border-border bg-accent/5 px-6 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">
              AI-suggested reply
            </span>
          </div>
          <div className="rounded-lg border border-accent/20 bg-card p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {aiDraft}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
            <div className="flex-1" />
            <Button size="sm" className="h-7 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
              <Send className="h-3 w-3" />
              Send
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              Edit
            </Button>
          </div>
        </div>
      )}

      {/* Reply Composer */}
      <div className="border-t border-border px-6 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">Reply</span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
          />
          <Button size="icon" className="h-9 w-9 bg-accent text-accent-foreground hover:bg-accent/90">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function CustomerContext({ thread }: { thread: EmailThread }) {
  const customer = customers[thread.company]

  if (!customer) {
    return (
      <div className="flex h-full w-[300px] shrink-0 flex-col items-center justify-center border-l border-border bg-card p-6">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-card",
            thread.color
          )}
        >
          {thread.initials}
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          {thread.company}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          No customer data available
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-card">
      {/* Customer Header */}
      <div className="flex flex-col items-center border-b border-border px-6 py-6">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-card",
            customer.color
          )}
        >
          {customer.initials}
        </div>
        <h3 className="mt-3 text-base font-semibold text-foreground">
          {customer.name}
        </h3>
        <p className="mt-1 text-sm text-accent">
          {customer.openInvoices} open invoice{customer.openInvoices !== 1 ? "s" : ""}
        </p>
        <p className="text-xl font-bold text-destructive">
          {formatCurrency(customer.totalOutstanding)}
        </p>
      </div>

      {/* Open Invoices */}
      <div className="border-b border-border px-5 py-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Open Invoices
        </h4>
        <div className="mt-3 space-y-2">
          {customer.invoices
            .filter((inv) => inv.status !== "paid")
            .map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-foreground">
                    {inv.id}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Due: {inv.dueDate}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(inv.amount)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Invoice History */}
      <div className="border-b border-border px-5 py-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Invoice history
        </h4>
        <div className="mt-3 flex items-center gap-2">
          {customer.invoiceHistory.map((hist, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  hist.status === "paid"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    hist.status === "paid" ? "bg-success" : "bg-destructive"
                  )}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatCurrency(hist.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Activity Log */}
      <div className="px-5 py-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Agent Activity Log
        </h4>
        <div className="mt-3 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/10">
              <Pause className="h-3 w-3 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">Reminders paused — IN-1041</p>
              <p className="text-[10px] text-muted-foreground">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-chart-1/10">
              <CalendarClock className="h-3 w-3 text-chart-1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">Follow-up scheduled Feb 24</p>
              <p className="text-[10px] text-muted-foreground">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-700/10">
              <Mail className="h-3 w-3 text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">Overdue notice sent — IN-1041</p>
              <p className="text-[10px] text-muted-foreground">3 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InboxPage() {
  console.log("[v0] InboxPage rendering, threads:", threads.length)
  const [selectedThread, setSelectedThread] = useState(threads[7]?.id || threads[0].id)
  const [filter, setFilter] = useState<FilterTab>("open")
  const thread = threads.find((t) => t.id === selectedThread) || threads[0]

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <ThreadList
        threads={threads}
        selectedId={selectedThread}
        onSelect={setSelectedThread}
        filter={filter}
        onFilterChange={setFilter}
      />
      <EmailView thread={thread} />
      <CustomerContext thread={thread} />
    </div>
  )
}
