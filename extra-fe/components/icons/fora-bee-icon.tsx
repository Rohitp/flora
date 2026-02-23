import { cn } from "@/lib/utils"

export function ForaBeeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
    >
      {/* Head */}
      <circle cx="12" cy="7.5" r="2.5" />

      {/* Body */}
      <ellipse cx="12" cy="15" rx="4" ry="5.5" />

      {/* Stripes across body */}
      <line x1="8.2" y1="13.5" x2="15.8" y2="13.5" />
      <line x1="8.5" y1="16" x2="15.5" y2="16" />

      {/* Wings - left */}
      <path d="M8 11.5C5.5 10 4 7.5 5 6c1-.8 3 0 3 2.5" />
      {/* Wings - right */}
      <path d="M16 11.5C18.5 10 20 7.5 19 6c-1-.8-3 0-3 2.5" />

      {/* Antennae */}
      <path d="M10.5 5.5L9 2.5" />
      <path d="M13.5 5.5L15 2.5" />

      {/* Sparkle dots on antenna tips */}
      <circle cx="8.5" cy="2" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="2" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
