"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Upload, FileText, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

type ChatStep = "initial" | "uploading" | "parsed" | "confirmed" | "error"

interface ChatMessage {
  sender: "fora" | "user"
  content: React.ReactNode
  id: string
}

function ForaAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
      <Image
        src="/images/fora.png"
        alt="Fora"
        width={32}
        height={32}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

function ChatBubble({ message, isNew }: { message: ChatMessage; isNew: boolean }) {
  const isFora = message.sender === "fora"
  return (
    <div
      className={cn(
        "flex gap-3 transition-all duration-500",
        isNew ? "animate-in fade-in slide-in-from-bottom-2" : "",
        isFora ? "items-start" : "items-start justify-end"
      )}
    >
      {isFora && <ForaAvatar />}
      <div
        className={cn(
          "max-w-[480px] rounded-xl px-4 py-3 text-sm leading-relaxed",
          isFora ? "bg-[#f1f5f9] text-[#1e293b]" : "bg-[#3b82f6] text-white"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ForaAvatar />
      <div className="flex items-center gap-1.5 rounded-xl bg-[#f1f5f9] px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#94a3b8] [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#94a3b8] [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#94a3b8] [animation-delay:300ms]" />
      </div>
    </div>
  )
}

function ParsedResult({ rulesCount, invoicesScheduled }: { rulesCount: number; invoicesScheduled: number }) {
  return (
    <div>
      <p>{"Here's what I found in your policy document:"}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        <li className="flex items-baseline gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
          <span>
            <span className="font-medium">{rulesCount} reminder rules</span>
            {" extracted from the document"}
          </span>
        </li>
        <li className="flex items-baseline gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
          <span>
            <span className="font-medium">{invoicesScheduled} invoices</span>
            {" scheduled across all customers"}
          </span>
        </li>
      </ul>
      <p className="mt-4">{"Shall I activate this as your Default Automation?"}</p>
    </div>
  )
}

export default function UploadPolicyPage() {
  const router = useRouter()
  const [step, setStep] = useState<ChatStep>("initial")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "fora-1",
      sender: "fora",
      content: "Upload your payment reminder or collections policy document.",
    },
  ])
  const [newMessageId, setNewMessageId] = useState<string | null>(null)
  const [rulesCount, setRulesCount] = useState(0)
  const [invoicesScheduled, setInvoicesScheduled] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, step])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so same file can be re-selected
    e.target.value = ""

    const userMsg: ChatMessage = {
      id: "user-upload",
      sender: "user",
      content: (
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {file.name}
        </span>
      ),
    }
    setMessages((prev) => [...prev, userMsg])
    setNewMessageId("user-upload")
    setStep("uploading")

    try {
      const result = await api.rules.upload(file)

      setRulesCount(result.rules_count)
      setInvoicesScheduled(result.invoices_scheduled)

      const parsedMsg: ChatMessage = {
        id: "fora-parsed",
        sender: "fora",
        content: (
          <ParsedResult
            rulesCount={result.rules_count}
            invoicesScheduled={result.invoices_scheduled}
          />
        ),
      }
      setMessages((prev) => [...prev, parsedMsg])
      setNewMessageId("fora-parsed")
      setStep("parsed")
    } catch (err) {
      const errMsg: ChatMessage = {
        id: "fora-error",
        sender: "fora",
        content: "Sorry, I couldn't read that document. Please make sure it's a valid PDF and try again.",
      }
      setMessages((prev) => [...prev, errMsg])
      setNewMessageId("fora-error")
      setStep("error")
    }
  }

  function handleConfirm() {
    const confirmMsg: ChatMessage = {
      id: "user-confirm",
      sender: "user",
      content: "Yes, activate it",
    }
    setMessages((prev) => [...prev, confirmMsg])
    setNewMessageId("user-confirm")

    const doneMsg: ChatMessage = {
      id: "fora-done",
      sender: "fora",
      content: "Done! Your Default Automation is now live. Redirecting you to Invoice Reminders…",
    }
    setTimeout(() => {
      setMessages((prev) => [...prev, doneMsg])
      setNewMessageId("fora-done")
      setStep("confirmed")
    }, 300)

    setTimeout(() => router.push("/automations"), 1800)
  }

  function handleRetry() {
    setStep("initial")
    fileInputRef.current?.click()
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
        <div className="flex items-center gap-3">
          <ForaAvatar />
          <div>
            <h1 className="text-sm font-semibold text-[#0f172a]">
              Configure Reminder Policy
            </h1>
            <p className="text-xs text-[#94a3b8]">Guided setup with Fora</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/automations")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#334155]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isNew={msg.id === newMessageId}
            />
          ))}
          {step === "uploading" && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="border-t border-[#e2e8f0] bg-[#fafbfc]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-6 py-5">
          {step === "initial" && (
            <div className="flex flex-col items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 rounded-xl border-2 border-dashed border-[#cbd5e1] px-8 py-5 transition-all hover:border-[#3b82f6]/40 hover:bg-[#f8fafc]"
              >
                <Upload className="h-5 w-5 text-[#64748b]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[#334155]">
                    Upload your policy document
                  </p>
                  <p className="text-xs text-[#94a3b8]">PDF, DOC, DOCX, or TXT</p>
                </div>
              </button>
            </div>
          )}

          {step === "uploading" && (
            <div className="flex items-center gap-2.5 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Reading your policy with AI…</span>
            </div>
          )}

          {step === "parsed" && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleConfirm}
                size="sm"
                className="gap-1.5 bg-[#3b82f6] text-xs hover:bg-[#2563eb]"
              >
                <Check className="h-3.5 w-3.5" />
                Yes, activate it
              </Button>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Upload different file
              </Button>
            </div>
          )}

          {step === "confirmed" && (
            <div className="flex items-center gap-2.5 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Activating your automation…</span>
            </div>
          )}

          {step === "error" && (
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={handleRetry}
                size="sm"
                className="text-xs"
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
