"use client"

import { useState } from "react"
import {
  FileText,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Mail,
  MessageSquare,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { collectionsSnapshot, fmt, fmtCount } from "@/lib/collections-data"

function OpenItemCard({
  label,
  count,
  amount,
  icon: Icon,
  dialogTitle,
  dialogDescription,
}: {
  label: string
  count: string
  amount: string
  icon: React.ElementType
  dialogTitle: string
  dialogDescription: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-card px-3 py-2.5">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
        <div className="mt-1.5">
          <p className="text-xl font-bold leading-none tracking-tight text-foreground tabular-nums">
            {count}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {amount} outstanding
          </p>
        </div>
        <div className="mt-2 flex justify-end border-t border-border/30 pt-1.5">
          <button
            onClick={() => setOpen(true)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            View list
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-5">
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="mb-4 h-20 rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Skeleton className="h-44 rounded-lg" />
        </div>
        <Skeleton className="h-44 rounded-lg" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="p-5">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        Collections Overview
      </h1>
      <div className="mt-10 flex flex-col items-center justify-center py-16 text-center">
        <FileText className="mb-3 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">
          No outstanding invoices in selected period.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Try adjusting your date range.
        </p>
      </div>
    </div>
  )
}

export default function CollectionsPage() {
  const [isLoading] = useState(false)
  const [isEmpty] = useState(false)

  const data = collectionsSnapshot

  if (isLoading) return <LoadingSkeleton />
  if (isEmpty) return <EmptyState />

  return (
    <div className="p-5">
      <div className="mb-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Collections Overview
        </h1>
      </div>

      {/* HERO: Outstanding | Overdue | DSO */}
      <Card className="mb-4">
        <CardContent className="px-5 py-3.5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Outstanding
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
                {fmt(data.totals.totalOutstanding)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Across open invoices
              </p>
            </div>
            <div className="sm:border-l sm:border-border/40 sm:pl-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Overdue
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
                {fmt(data.totals.totalOverdue)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {data.totals.overduePercent}% of outstanding
              </p>
            </div>
            <div className="sm:border-l sm:border-border/40 sm:pl-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                DSO
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
                {data.dso}
                <span className="ml-1 text-sm font-medium text-muted-foreground">days</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Last 6 months
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ageing Buckets */}
      <Card className="mb-4">
        <CardContent className="px-5 py-3.5">
          <p className="mb-3 text-xs font-semibold text-foreground">Ageing Breakdown</p>
          <div className="flex h-5 w-full overflow-hidden rounded-md">
            {data.ageing.map((b) => (
              <div
                key={b.label}
                style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                className="transition-all"
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {data.ageing.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: b.color }}
                />
                <div>
                  <p className="text-[11px] font-medium text-foreground">{b.label}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {fmt(b.amount)} ({b.percent}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BODY: 2-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2.5">
            <OpenItemCard
              label="Open Invoices"
              count={fmtCount(data.counts.openInvoices)}
              amount={fmt(data.counts.openInvoicesAmount)}
              icon={FileText}
              dialogTitle="Open Invoices"
              dialogDescription={`Opens the Invoices list page showing ${fmtCount(data.counts.openInvoices)} open invoices.`}
            />
            <OpenItemCard
              label="Overdue Invoices"
              count={fmtCount(data.counts.overdueInvoices)}
              amount={fmt(data.counts.overdueInvoicesAmount)}
              icon={AlertTriangle}
              dialogTitle="Overdue Invoices"
              dialogDescription={`Opens the Invoices list page showing ${fmtCount(data.counts.overdueInvoices)} overdue invoices.`}
            />
            <OpenItemCard
              label="Customers with Open"
              count={fmtCount(data.counts.customersWithOpen)}
              amount={fmt(data.counts.customersWithOpenAmount)}
              icon={Users}
              dialogTitle="Customers with Open Invoices"
              dialogDescription={`Opens the Customers list page showing ${fmtCount(data.counts.customersWithOpen)} customers with open invoices.`}
            />
            <OpenItemCard
              label="Customers Overdue"
              count={fmtCount(data.counts.customersWithOverdue)}
              amount={fmt(data.counts.customersWithOverdueAmount)}
              icon={Clock}
              dialogTitle="Customers with Overdue Invoices"
              dialogDescription={`Opens the Customers list page showing ${fmtCount(data.counts.customersWithOverdue)} customers with overdue invoices.`}
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-primary/15 bg-primary/[0.02]">
            <CardContent className="px-4 py-3.5">
              <h2 className="text-sm font-semibold text-foreground">
                Automate Your Collections
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Follow-ups, disputes, and cash application — powered by Chargebee Receivables.
              </p>
              <ul className="mt-2.5 space-y-2">
                {[
                  { icon: CheckCircle2, text: "Track Promise-to-Pay" },
                  { icon: Mail, text: "Automate follow-ups" },
                  { icon: MessageSquare, text: "Resolve disputes" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-xs text-muted-foreground">{text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
