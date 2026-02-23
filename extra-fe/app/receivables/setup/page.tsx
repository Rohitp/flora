"use client"

import Image from "next/image"
import Link from "next/link"
import { FileText, PenLine } from "lucide-react"

export default function ReceivablesSetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex w-full max-w-lg flex-col items-center px-6 text-center">
        {/* Hero image */}
        <div className="mb-8">
          <Image
            src="/images/fora-hero.jpg"
            alt="Fora, your AI collections assistant"
            width={240}
            height={240}
            className="rounded-2xl"
            priority
          />
        </div>

        {/* Headline */}
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f172a]">
          {"Hi, I'm Fora."}
        </h1>
        <p className="mt-1 text-[15px] text-[#64748b]">
          Your AI Collections Co-worker
        </p>

        {/* Question */}
        <p className="mt-8 max-w-md text-[15px] leading-relaxed text-[#334155]">
          {"I'll help you set up automated invoice reminders in under 5 minutes."}
        </p>
        <p className="mt-3 text-sm font-medium text-[#0f172a]">
          Do you already have a payment reminder or collections policy document?
        </p>

        {/* Buttons */}
        <div className="mt-5 flex w-full gap-3">
          <Link
            href="/receivables/setup/upload"
            className="group flex flex-1 flex-col items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-5 py-6 transition-all hover:border-[#3b82f6]/30 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6ff] transition-colors group-hover:bg-[#dbeafe]">
              <FileText className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <span className="text-sm font-medium text-[#0f172a]">
              Upload Policy Document
            </span>
          </Link>

          <Link
            href="/receivables/setup/create"
            className="group flex flex-1 flex-col items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-5 py-6 transition-all hover:border-[#3b82f6]/30 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6ff] transition-colors group-hover:bg-[#dbeafe]">
              <PenLine className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <span className="text-sm font-medium text-[#0f172a]">
              Help Me Create One
            </span>
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-[#94a3b8]">
          You can review everything before activation.
        </p>
      </div>
    </div>
  )
}
