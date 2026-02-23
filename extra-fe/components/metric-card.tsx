import { Info } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  subValue?: string
}

export function MetricCard({ label, value, subValue }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-card-foreground">{value}</span>
        {subValue && <span className="text-sm text-muted-foreground">{subValue}</span>}
      </div>
    </div>
  )
}
