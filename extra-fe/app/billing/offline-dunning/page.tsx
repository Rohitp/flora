export default function OfflineDunningPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Offline Dunning</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage offline payment recovery workflows for failed transactions.
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-foreground">Coming Soon</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Offline dunning workflows are currently under development. Check back soon.
          </p>
        </div>
      </div>
    </div>
  )
}
