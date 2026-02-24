"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Upload, FileText, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ChatMessage {
  sender: "fora" | "user"
  content: React.ReactNode
  id: string
}

type UploadPhase =
  | "initial"
  | "uploaded"
  | "analyzing"
  | "analysis-complete"
  | "optimize-question"
  | "optimizing"
  | "optimized"
  | "confirmed"
  | "navigating"

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
          "max-w-[480px] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
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
/*  Animated Analysis Progress                                         */
/* ------------------------------------------------------------------ */
function AnalysisProgress({ phase: analysisPhase }: { phase: number }) {
  const steps = [
    "Analyzing reminder cadence...",
    "Identifying escalation rules...",
    "Extracting tone and communication patterns...",
    "Mapping customer segment logic...",
  ]

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ForaAvatar />
      <div className="rounded-xl bg-[#f1f5f9] px-4 py-3">
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2.5 text-sm transition-all duration-500",
                i <= analysisPhase ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
              )}
            >
              {i < analysisPhase ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" />
              ) : i === analysisPhase ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#3b82f6]" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#cbd5e1]" />
              )}
              <span
                className={cn(
                  "text-[13px]",
                  i < analysisPhase
                    ? "text-[#64748b]"
                    : i === analysisPhase
                      ? "text-[#1e293b] font-medium"
                      : "text-[#94a3b8]"
                )}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quick-Reply Buttons                                                */
/* ------------------------------------------------------------------ */
function QuickReplies({
  options,
  onSelect,
}: {
  options: string[]
  onSelect: (option: string) => void
}) {
  return (
    <div className="ml-11 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[13px] font-medium text-[#334155] shadow-sm transition-all hover:border-[#3b82f6] hover:bg-[#f8fafc] hover:text-[#3b82f6] active:scale-[0.98]"
        >
          {option}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function UploadPolicyPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<UploadPhase>("initial")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "fora-1",
      sender: "fora",
      content:
        "Upload your payment reminder or collections policy document.\n\nI\u2019ll analyze it and extract your reminder cadence, escalation rules, and tone patterns.",
    },
  ])
  const [analysisStep, setAnalysisStep] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [newMessageId, setNewMessageId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const msgCounter = useRef(0)

  const nextId = useCallback((prefix: string) => {
    msgCounter.current++
    return `${prefix}-${msgCounter.current}`
  }, [])

  /* Auto-scroll */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, phase, analysisStep])

  /* Helper: add Fora message after typing animation */
  const foraReply = useCallback(
    (content: React.ReactNode, nextPhase: UploadPhase, delay = 2000) => {
      setTimeout(() => {
        const id = nextId("fora")
        const msg: ChatMessage = { id, sender: "fora", content }
        setMessages((prev) => [...prev, msg])
        setNewMessageId(id)
        setPhase(nextPhase)
      }, delay)
    },
    [nextId]
  )

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
    setPhase("uploaded")

    // Start analysis animation
    setTimeout(() => {
      setPhase("analyzing")
      setAnalysisStep(0)
    }, 600)
  }

  /* Step through analysis phases */
  useEffect(() => {
    if (phase !== "analyzing") return
    if (analysisStep >= 4) {
      // Analysis complete -- show findings
      setTimeout(() => {
        setPhase("analysis-complete")
        const id = nextId("fora")
        setMessages((prev) => [
          ...prev,
          {
            id,
            sender: "fora",
            content: `I\u2019ve reviewed your policy. Here\u2019s what I\u2019m seeing:\n\nYour policy starts reminders only after invoices are overdue. The first follow-up goes out 7 days past due, with a second at 14 days. There\u2019s no pre-due reminder, and tone escalates after 14 days.\n\nThis is a solid foundation, but there\u2019s room to improve. Would you like me to optimize this based on B2B best practices?`,
          },
        ])
        setNewMessageId(id)
        setPhase("optimize-question")
      }, 800)
      return
    }
    const timer = setTimeout(() => {
      setAnalysisStep((s) => s + 1)
    }, 1200)
    return () => clearTimeout(timer)
  }, [phase, analysisStep, nextId])

  /* Handle optimize decision */
  function handleOptimizeChoice(optimize: boolean) {
    const id = nextId("user")
    setMessages((prev) => [
      ...prev,
      {
        id,
        sender: "user",
        content: optimize ? "Yes, optimize it" : "Keep it as is",
      },
    ])
    setNewMessageId(id)

    if (optimize) {
      setPhase("optimizing")

      // Show typing then optimized result
      foraReply(
        `Here\u2019s what I\u2019d change:\n\n\u2022 Add a reminder 3 days before the due date \u2014 this prevents invoices from slipping into overdue in the first place.\n\u2022 Move the first follow-up from 7 days to 5 days \u2014 shorter gaps maintain payment momentum.\n\u2022 Start with a warm tone and escalate at Day 10, not Day 14 \u2014 waiting too long can signal that late payment is acceptable.\n\nBased on your existing policy, I\u2019ve kept the structure familiar while tightening the timeline. This typically improves collection rates by 25\u201335%.`,
        "optimized",
        2800
      )
    } else {
      setPhase("confirmed")
      foraReply(
        `No problem \u2014 your current policy has a clear structure. I\u2019ll set it up exactly as written.\n\nLet me configure this for you...`,
        "navigating",
        1800
      )
      setTimeout(() => {
        router.push("/receivables/setup/summary")
      }, 4500)
    }
  }

  /* Handle "Looks good" after optimization */
  function handleConfirmOptimized() {
    const id = nextId("user")
    setMessages((prev) => [
      ...prev,
      { id, sender: "user", content: "Looks good, let\u2019s use this" },
    ])
    setNewMessageId(id)
    setPhase("confirmed")

    foraReply(
      "Great \u2014 I\u2019ll set up the optimized strategy now.\n\nLet me put this together for you...",
      "navigating",
      1800
    )
    setTimeout(() => {
      router.push("/receivables/setup/summary")
    }, 4500)
  }

  /* Handle free-text as a response */
  function handleSendMessage() {
    const text = inputValue.trim()
    if (!text) return
    setInputValue("")

    const lower = text.toLowerCase()

    if (phase === "optimize-question") {
      const wantsOptimize =
        lower.includes("yes") || lower.includes("optimize") || lower.includes("improve")
      handleOptimizeChoice(wantsOptimize)
    } else if (phase === "optimized") {
      handleConfirmOptimized()
    }
  }

  const isInputPhase = phase === "optimize-question" || phase === "optimized"

  const quickReplies =
    phase === "optimize-question"
      ? ["Yes, optimize it", "Keep it as is"]
      : phase === "optimized"
        ? ["Looks good, let\u2019s use this", "Keep original instead"]
        : null

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center border-b border-[#e2e8f0] px-6 py-4">
        <div className="flex items-center gap-3">
          <ForaAvatar />
          <div>
            <h1 className="text-sm font-semibold text-[#0f172a]">
              Analyze Policy Document
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Document intelligence with Fora
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

          {/* Analysis progress animation */}
          {phase === "analyzing" && <AnalysisProgress phase={analysisStep} />}

          {/* Typing indicator */}
          {phase === "optimizing" && <TypingIndicator />}

          {/* Quick replies */}
          {quickReplies && (
            <QuickReplies
              options={quickReplies}
              onSelect={(opt) => {
                if (phase === "optimize-question") {
                  handleOptimizeChoice(opt.toLowerCase().includes("yes") || opt.toLowerCase().includes("optimize"))
                } else if (phase === "optimized") {
                  if (opt.toLowerCase().includes("original")) {
                    // User wants to keep original -- go with unoptimized
                    const id = nextId("user")
                    setMessages((prev) => [...prev, { id, sender: "user", content: opt }])
                    setNewMessageId(id)
                    setPhase("confirmed")
                    foraReply(
                      "Understood \u2014 I\u2019ll use your original policy as-is. Setting it up now...",
                      "navigating",
                      1800
                    )
                    setTimeout(() => {
                      router.push("/receivables/setup/summary")
                    }, 4500)
                  } else {
                    handleConfirmOptimized()
                  }
                }
              }}
            />
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom action area */}
      <div className="border-t border-[#e2e8f0] bg-[#fafbfc]">
        <div className="mx-auto w-full max-w-2xl px-6 py-4">
          {/* Upload state */}
          {phase === "initial" && (
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

          {/* Uploading / analyzing state */}
          {(phase === "uploaded" || phase === "analyzing" || phase === "analysis-complete") && (
            <div className="flex items-center justify-center gap-2.5 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {phase === "analyzing"
                  ? "Analyzing your document..."
                  : "Processing..."}
              </span>
            </div>
          )}

          {/* Input phase -- text input + quick replies */}
          {isInputPhase && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your answer or pick an option above..."
                className="flex-1 rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8]/60 outline-none transition-colors focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/20"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                  inputValue.trim()
                    ? "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                    : "bg-[#f1f5f9] text-[#cbd5e1] cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Confirmed / navigating state */}
          {(phase === "confirmed" || phase === "navigating" || phase === "optimizing") && (
            <div className="flex items-center justify-center gap-2.5 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {phase === "optimizing"
                  ? "Optimizing your policy..."
                  : "Setting up your configuration..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
