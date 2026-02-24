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
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { collectionsSnapshot, fmt, fmtCount, type AgeingBucket } from "@/lib/collections-data"

/* ------------------------------------------------------------------ */
/*  Ageing Bucket Card                                                */
/* ------------------------------------------------------------------ */
function AgeingBucketCard({ bucket: b }: { bucket: AgeingBucket }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex cursor-pointer flex-col rounded-md border border-border/50 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/40"
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: b.color }}
          />
          <p className="text-[11px] font-medium text-muted-foreground">{b.label}</p>
        </div>
        <p className="mt-1.5 text-lg font-bold tabular-nums text-foreground">
          {fmtCount(b.invoiceCount)}
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">invoices</span>
        </p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {fmt(b.amount)} ({b.percent}%)
        </p>
        <div className="mt-1.5 flex w-full justify-end border-t border-border/30 pt-1.5">
          <span className="text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View list
          </span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              {b.label} Invoices
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed">
              {`Opens the Invoices list page showing ${fmtCount(b.invoiceCount)} invoices aged ${b.label.toLowerCase()}, totalling ${fmt(b.amount)} outstanding.`}
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

/* ------------------------------------------------------------------ */
/*  Open Item Card                                                    */
/* ------------------------------------------------------------------ */
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
      <button
        onClick={() => setOpen(true)}
        className="group flex cursor-pointer flex-col justify-between rounded-lg border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/40"
      >
        <div className="flex w-full items-start justify-between">
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
        <div className="mt-2 flex w-full justify-end border-t border-border/30 pt-1.5">
          <span className="text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View list
          </span>
        </div>
      </button>

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

      {/* Invoice Ageing */}
      <Card className="mb-4">
        <CardContent className="px-5 py-3.5">
          <p className="mb-3 text-xs font-semibold text-foreground">Invoice Ageing</p>

          {/* Stacked bar with tooltips */}
          <TooltipProvider delayDuration={0}>
            <div className="flex h-5 w-full overflow-hidden rounded-md">
              {data.ageing.map((b) => (
                <Tooltip key={b.label}>
                  <TooltipTrigger asChild>
                    <div
                      style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                      className="cursor-default transition-all hover:brightness-110"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-semibold">{b.label}</p>
                    <p className="text-background/70">{fmtCount(b.invoiceCount)} invoices &middot; {fmt(b.amount)} ({b.percent}%)</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* Bucket cards */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {data.ageing.map((b) => (
              <AgeingBucketCard key={b.label} bucket={b} />
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
                Follow-ups, disputes, and cash application.
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
              <Button size="sm" className="mt-3 w-full gap-1.5 text-xs" asChild>
                <Link href="/automations/create">
                  Try Chargebee Receivables
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
