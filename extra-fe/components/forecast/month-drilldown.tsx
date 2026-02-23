"use client"

import { useState } from "react"
import { X, Search, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  type InvoiceEvent,
  type MonthForecast,
  getMonthEvents,
  getMonthSubscriptions,
  formatCurrency,
  subscriptions,
} from "@/lib/forecast-data"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Tab = "invoices" | "subscriptions"

export function MonthDrilldown({
  monthData,
  allEvents,
  basis,
  onClose,
}: {
  monthData: MonthForecast
  allEvents: InvoiceEvent[]
  basis: "invoice" | "collection"
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>("invoices")
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [termsFilter, setTermsFilter] = useState("all")
  const [expandedSub, setExpandedSub] = useState<string | null>(null)

  const events = getMonthEvents(allEvents, monthData.monthKey, basis)
  const subData = getMonthSubscriptions(allEvents, monthData.monthKey, basis)

  const filteredEvents = events.filter((ev) => {
    if (search && !ev.customer.toLowerCase().includes(search.toLowerCase()) && !ev.subscriptionId.toLowerCase().includes(search.toLowerCase())) return false
    if (planFilter !== "all" && ev.plan !== planFilter) return false
    if (methodFilter !== "all" && ev.collectionMethod !== methodFilter) return false
    if (termsFilter !== "all" && ev.paymentTerms !== termsFilter) return false
    return true
  })

  const filteredSubs = subData.filter(({ sub }) => {
    if (search && !sub.customer.toLowerCase().includes(search.toLowerCase()) && !sub.id.toLowerCase().includes(search.toLowerCase())) return false
    if (planFilter !== "all" && sub.plan !== planFilter) return false
    if (methodFilter !== "all" && sub.collectionMethod !== methodFilter) return false
    return true
  })

  const plans = Array.from(new Set(events.map((e) => e.plan)))

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Details for {monthData.month}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Expected Cash: <span className="font-semibold text-card-foreground">{formatCurrency(monthData.expectedCash)}</span>
          </p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("invoices")}
          className={cn(
            "px-5 py-2.5 text-xs font-medium transition-colors",
            tab === "invoices"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Invoices (billing events)
        </button>
        <button
          onClick={() => setTab("subscriptions")}
          className={cn(
            "px-5 py-2.5 text-xs font-medium transition-colors",
            tab === "subscriptions"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Subscriptions
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-32 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="Auto">Auto</SelectItem>
            <SelectItem value="Manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        {tab === "invoices" && (
          <Select value={termsFilter} onValueChange={setTermsFilter}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="Net 0">Net 0</SelectItem>
              <SelectItem value="Net 30">Net 30</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "invoices" ? (
          <div>
            {/* Invoices table header */}
            <div className="sticky top-0 grid grid-cols-8 gap-2 border-b border-border bg-muted/40 px-5 py-2 text-[11px] font-medium text-muted-foreground">
              <span>Collection Date</span>
              <span>Invoice Date</span>
              <span>Customer</span>
              <span>Subscription</span>
              <span>Plan</span>
              <span className="text-right">Amount</span>
              <span>Collection</span>
              <span>Terms</span>
            </div>
            <div className="divide-y divide-border">
              {filteredEvents.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No invoices match your filters.
                </div>
              ) : (
                filteredEvents.map((ev, i) => (
                  <div key={i} className="grid grid-cols-8 gap-2 px-5 py-2 text-xs transition-colors hover:bg-muted/20">
                    <span className="text-card-foreground">{formatDate(ev.expectedCollectionDate)}</span>
                    <span className="text-muted-foreground">{formatDate(ev.invoiceDate)}</span>
                    <span className="truncate font-medium text-card-foreground">{ev.customer}</span>
                    <span className="text-muted-foreground">{ev.subscriptionId}</span>
                    <span className="text-muted-foreground">{ev.plan}</span>
                    <span className="text-right font-semibold text-card-foreground tabular-nums">{formatCurrency(ev.amount)}</span>
                    <Badge variant="outline" className="h-5 w-fit text-[10px]">{ev.collectionMethod}</Badge>
                    <span className="text-muted-foreground">{ev.paymentTerms}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Subscriptions table header */}
            <div className="sticky top-0 grid grid-cols-7 gap-2 border-b border-border bg-muted/40 px-5 py-2 text-[11px] font-medium text-muted-foreground">
              <span>Customer</span>
              <span>Subscription ID</span>
              <span>Plan + Frequency</span>
              <span>Product Family</span>
              <span className="text-right">Amount</span>
              <span>Frequency</span>
              <span>Notes</span>
            </div>
            <div className="divide-y divide-border">
              {filteredSubs.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No subscriptions match your filters.
                </div>
              ) : (
                filteredSubs.map(({ sub, events: subEvents }) => (
                  <div key={sub.id}>
                    <button
                      onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                      className="grid w-full grid-cols-7 gap-2 px-5 py-2 text-left text-xs transition-colors hover:bg-muted/20"
                    >
                      <span className="flex items-center gap-1 truncate font-medium text-card-foreground">
                        {expandedSub === sub.id ? (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {sub.customer}
                      </span>
                      <span className="text-muted-foreground">{sub.id}</span>
                      <span className="text-muted-foreground">{sub.plan} / {sub.billingFrequency}</span>
                      <span className="text-muted-foreground">{sub.productFamily}</span>
                      <span className="text-right font-semibold text-card-foreground tabular-nums">{formatCurrency(sub.amount)}</span>
                      <span className="text-muted-foreground">{sub.billingFrequency}</span>
                      <span className="flex gap-1">
                        {sub.notes.map((n, ni) => (
                          <Badge key={ni} variant="secondary" className="text-[10px]">{n}</Badge>
                        ))}
                      </span>
                    </button>
                    {expandedSub === sub.id && (
                      <div className="border-t border-border/50 bg-muted/20 px-5 py-2">
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                          Future billing events within horizon
                        </p>
                        <div className="flex flex-col gap-1">
                          {subEvents.map((ev, ei) => (
                            <div key={ei} className="flex items-center gap-4 text-[11px]">
                              <span className="w-24 text-muted-foreground">{formatDate(ev.invoiceDate)}</span>
                              <span className="font-medium text-card-foreground tabular-nums">{formatCurrency(ev.amount)}</span>
                              <span className="text-muted-foreground">{ev.paymentTerms}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
