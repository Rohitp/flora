import { Bell } from "lucide-react"

export default function P2PRemindersPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">P2P Reminders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Automate promise-to-pay follow-up reminders for committed payments.
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Coming Soon</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            P2P reminder workflows are currently under development. Check back soon.
          </p>
        </div>
      </div>
    </div>
  )
}
