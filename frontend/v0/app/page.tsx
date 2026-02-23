import { MetricCard } from "@/components/metric-card"
import { Button } from "@/components/ui/button"
import { Rocket } from "lucide-react"

export default function Home() {
  return (
    <div className="p-8">
      {/* Banner */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-card px-6 py-4">
        <p className="text-sm font-medium text-card-foreground">
          {"Learn more about Chargebee's capabilities"}
        </p>
        <Button size="sm" variant="outline" className="text-xs">
          Talk to a Product Expert
        </Button>
      </div>

      {/* Test site notice */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Rocket className="h-4 w-4" />
        <span>
          {"You're seeing sample data on the Test Site. Switch to the Live Site for real insights."}
        </span>
      </div>

      {/* Metric cards */}
      <div className="mb-8 grid grid-cols-5 gap-4">
        <MetricCard label="Total MRR" value="84.920 EUR" />
        <MetricCard label="Total Active Subscriptions" value="1,702" />
        <MetricCard label="Net Billing" value="198.805 EUR" />
        <MetricCard label="Net Payments" value="194.800 EUR" />
        <MetricCard label="Unpaid Invoices" value="80" subValue="2.340 EUR" />
      </div>

      {/* Time filters */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex rounded-md border border-border bg-card">
          <button className="rounded-l-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
            Daily
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            3 months
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            6 months
          </button>
          <button className="rounded-r-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            12 months
          </button>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          All (EUR)
        </Button>
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Total Billing</h3>
          </div>
          <p className="mb-4 text-2xl font-semibold tracking-tight text-card-foreground">
            {"EUR 54.52K"}{" "}
            <span className="text-xs font-normal text-muted-foreground">Jan EUR 79.64K</span>
          </p>
          <div className="flex h-48 items-end gap-1">
            {[40, 55, 30, 70, 65, 80, 45, 60, 50, 75, 85, 55, 65, 70, 60, 78].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-[#3b82f6]/25" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Total New Billing</h3>
          </div>
          <p className="mb-4 text-2xl font-semibold tracking-tight text-card-foreground">
            {"EUR 4.22K"}{" "}
            <span className="text-xs font-normal text-muted-foreground">Jan EUR 9.41K</span>
          </p>
          <div className="flex h-48 items-end gap-1">
            {[20, 55, 45, 70, 35, 60, 80, 25, 65, 50, 40, 75, 30, 55, 45, 35].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-[#3b82f6]/25" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
