"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileSpreadsheet, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export function ExportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [type, setType] = useState<"summary" | "invoice">("summary")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Export Forecast Data</DialogTitle>
          <DialogDescription className="text-xs">
            Choose the export format to download as CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <button
            onClick={() => setType("summary")}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              type === "summary"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/30"
            )}
          >
            <FileSpreadsheet className={cn("h-5 w-5", type === "summary" ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium text-card-foreground">Monthly summary</p>
              <p className="text-xs text-muted-foreground">
                Aggregated monthly forecast with totals and counts.
              </p>
            </div>
          </button>
          <button
            onClick={() => setType("invoice")}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              type === "invoice"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/30"
            )}
          >
            <FileText className={cn("h-5 w-5", type === "invoice" ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium text-card-foreground">Invoice-level events</p>
              <p className="text-xs text-muted-foreground">
                Detailed line-by-line invoice events across the entire horizon.
              </p>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onClose}>
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
