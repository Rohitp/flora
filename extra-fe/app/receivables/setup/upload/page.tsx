"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Upload, FileText, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type ChatStep = "initial" | "uploaded" | "reviewing" | "parsed" | "confirmed"

interface ChatMessage {
  sender: "fora" | "user"
  content: React.ReactNode
  id: string
}

/* ------------------------------------------------------------------ */
/*  Fora Avatar                                                        */
/* ------------------------------------------------------------------ */
function ForaAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
      <Image
        src="/images/fora-hero.jpg"
        alt="Fora"
        width={32}
        height={32}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chat Bubble                                                        */
/* ------------------------------------------------------------------ */
function ChatBubble({
  message,
  isNew,
}: {
  message: ChatMessage
  isNew: boolean
}) {
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
          isFora
            ? "bg-[#f1f5f9] text-[#1e293b]"
            : "bg-[#3b82f6] text-white"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Typing Indicator                                                   */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Parsed Policy Content                                              */
/* ------------------------------------------------------------------ */
function ParsedPolicy() {
  const steps = [
    { offset: "3 days before due date", action: "Email reminder" },
    { offset: "On due date", action: "Reminder" },
    { offset: "7 days overdue", action: "Follow-up" },
    { offset: "14 days overdue", action: "Final notice" },
  ]

  return (
    <div>
      <p>{"Here's what I understand from your policy:"}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {steps.map((s) => (
          <li key={s.offset} className="flex items-baseline gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
            <span>
              <span className="font-medium">{s.offset}</span>
              {" \u2014 "}
              {s.action}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4">Does this look correct?</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function UploadPolicyPage() {
  const router = useRouter()
  const [step, setStep] = useState<ChatStep>("initial")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "fora-1",
      sender: "fora",
      content:
        "Upload your payment reminder or collections policy document.",
    },
  ])
  const [fileName, setFileName] = useState<string | null>(null)
  const [newMessageId, setNewMessageId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  /* Auto-scroll on new messages */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, step])

  /* Handle file selection */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
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
    setStep("uploaded")

    // Start "reviewing" after a brief pause
    setTimeout(() => {
      setStep("reviewing")
    }, 600)

    // Show parsed result after 2s
    setTimeout(() => {
      const parsedMsg: ChatMessage = {
        id: "fora-parsed",
        sender: "fora",
        content: <ParsedPolicy />,
      }
      setMessages((prev) => [...prev, parsedMsg])
      setNewMessageId("fora-parsed")
      setStep("parsed")
    }, 2600)
  }

  /* Handle "Yes, looks right" */
  function handleConfirm() {
    const confirmMsg: ChatMessage = {
      id: "user-confirm",
      sender: "user",
      content: "Yes, looks right",
    }
    setMessages((prev) => [...prev, confirmMsg])
    setNewMessageId("user-confirm")
    setStep("confirmed")

    setTimeout(() => {
      router.push("/receivables/setup/summary")
    }, 800)
  }

  /* Handle "Edit timing" */
  function handleEdit() {
    const editMsg: ChatMessage = {
      id: "user-edit",
      sender: "user",
      content: "Edit timing",
    }
    setMessages((prev) => [...prev, editMsg])
    setNewMessageId("user-edit")
    // For now, just acknowledge - this can route to an editor later
    setTimeout(() => {
      const ackMsg: ChatMessage = {
        id: "fora-edit-ack",
        sender: "fora",
        content:
          "No problem! Timing customization will be available in the next step. For now, let\u2019s proceed with this configuration.",
      }
      setMessages((prev) => [...prev, ackMsg])
      setNewMessageId("fora-edit-ack")
      setStep("parsed")
    }, 800)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center border-b border-[#e2e8f0] px-6 py-4">
        <div className="flex items-center gap-3">
          <ForaAvatar />
          <div>
            <h1 className="text-sm font-semibold text-[#0f172a]">
              Configure Reminder Policy
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Guided setup with Fora
            </p>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isNew={msg.id === newMessageId}
            />
          ))}

          {/* Typing indicator while reviewing */}
          {step === "reviewing" && <TypingIndicator />}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom action area */}
      <div className="border-t border-[#e2e8f0] bg-[#fafbfc]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-6 py-5">
          {/* Upload state */}
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
                  <p className="text-xs text-[#94a3b8]">
                    PDF, DOC, DOCX, or TXT
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Uploading / reviewing state */}
          {(step === "uploaded" || step === "reviewing") && (
            <div className="flex items-center gap-2.5 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Reviewing your policy...</span>
            </div>
          )}

          {/* Parsed — show action buttons */}
          {step === "parsed" && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleConfirm}
                size="sm"
                className="gap-1.5 bg-[#3b82f6] text-xs hover:bg-[#2563eb]"
              >
                <Check className="h-3.5 w-3.5" />
                Yes, looks right
              </Button>
              <Button
                onClick={handleEdit}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Edit timing
              </Button>
            </div>
          )}

          {/* Confirmed state */}
          {step === "confirmed" && (
            <div className="flex items-center gap-2.5 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Setting up your configuration...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
