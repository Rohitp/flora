"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export function SettingsPage() {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    setResetting(true)
    try {
      await api.admin.reset()
      setDone(true)
      setTimeout(() => router.push("/"), 1500)
    } finally {
      setResetting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Demo controls and configuration</p>
      </div>

      <div className="flex-1 px-8 py-8">
        <div className="max-w-lg">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <RotateCcw className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-foreground">Reset Demo</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Clears all rules, scheduled actions, inbox messages, and action logs.
                  Restores invoice statuses to their original seeded state. The app returns
                  to the empty state, ready for the next demo run.
                </p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" />Rules cleared — upload area reappears</li>
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" />All timelines wiped</li>
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" />Inbox emptied</li>
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" />Invoice statuses restored</li>
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-muted-foreground" />Customer data and global settings preserved</li>
                </ul>

                <div className="mt-5">
                  {done ? (
                    <p className="text-sm font-medium text-success">Reset complete — redirecting…</p>
                  ) : confirming ? (
                    <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive flex-1">This will wipe all demo state. Are you sure?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setConfirming(false)}
                          disabled={resetting}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleReset}
                          disabled={resetting}
                        >
                          {resetting ? "Resetting…" : "Yes, reset"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive"
                      onClick={() => setConfirming(true)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Demo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
