import { Banknote, ArrowRight, FileText, Users, BarChart3, Workflow } from "lucide-react"

export default function ReceivablesOverview() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3b82f6]/10">
            <Banknote className="h-5 w-5 text-[#3b82f6]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Receivables Overview
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage outstanding invoices, collections, and cash flow visibility.
            </p>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-8">
        {/* Quick access cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickAccessCard
            icon={<FileText className="h-4.5 w-4.5" />}
            title="Collections"
            description="Track outstanding and overdue invoices across your customer base."
            href="/receivables/collections"
          />
          <QuickAccessCard
            icon={<BarChart3 className="h-4.5 w-4.5" />}
            title="Forecast"
            description="Deterministic cash collection forecast from active subscriptions."
            href="/receivables/cash-flow"
          />
          <QuickAccessCard
            icon={<Workflow className="h-4.5 w-4.5" />}
            title="Automations"
            description="Set up follow-up sequences and escalation workflows."
            href="#"
          />
          <QuickAccessCard
            icon={<Users className="h-4.5 w-4.5" />}
            title="Reports"
            description="Ageing reports, DSO trends, and collection performance."
            href="#"
          />
        </div>

        {/* Empty state / placeholder */}
        <div className="mt-8 rounded-lg border border-border bg-card px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Banknote className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-foreground">
            Your receivables dashboard is being set up
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            Once configured, you will see real-time metrics on outstanding invoices, ageing
            breakdowns, DSO trends, and collection performance -- all in one place.
          </p>
        </div>
      </div>
    </div>
  )
}

function QuickAccessCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.02]"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-[#3b82f6]/10 group-hover:text-[#3b82f6]">
          {icon}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 transition-all group-hover:text-muted-foreground" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </a>
  )
}
