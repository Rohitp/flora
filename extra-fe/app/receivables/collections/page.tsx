"use client"

import { Banknote } from "lucide-react"

export default function ReceivablesCollectionsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Receivables</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track and manage outstanding invoices, collections activity, and payment status.
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Banknote className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Coming Soon</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            The Receivables dashboard is currently under development. Check back soon.
          </p>
        </div>
      </div>
    </div>
  )
}
