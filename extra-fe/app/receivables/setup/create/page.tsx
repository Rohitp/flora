"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ChatMessage {
  sender: "fora" | "user"
  content: React.ReactNode
  id: string
}

type ConversationPhase =
  | "opening"
  | "awaiting-first-input"
  | "interpreting"
  | "pre-due-question"
  | "post-pre-due"
  | "follow-up-question"
  | "post-follow-up"
  | "tone-question"
  | "post-tone"
  | "segment-question"
  | "post-segment"
  | "wrapping-up"
  | "navigating"

/* ------------------------------------------------------------------ */
/*  User memory: accumulates choices for personalization callbacks     */
/* ------------------------------------------------------------------ */
interface UserMemory {
  currentProcess: string
  addPreDue: boolean | null
  followUpCount: string | null
  toneStyle: string | null
  segment: string | null
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
/*  Quick-Reply Buttons (optional, alongside free-text)                */
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
export default function CreatePolicyPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<ConversationPhase>("opening")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showTyping, setShowTyping] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [newMessageId, setNewMessageId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const msgCounter = useRef(0)
  const memoryRef = useRef<UserMemory>({
    currentProcess: "",
    addPreDue: null,
    followUpCount: null,
    toneStyle: null,
    segment: null,
  })

  const nextId = useCallback((prefix: string) => {
    msgCounter.current++
    return `${prefix}-${msgCounter.current}`
  }, [])

  /* Auto-scroll */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, showTyping])

  /* Focus input when ready for text */
  useEffect(() => {
    if (
      phase === "awaiting-first-input" ||
      phase === "pre-due-question" ||
      phase === "follow-up-question" ||
      phase === "tone-question" ||
      phase === "segment-question"
    ) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase])

  /* Opening message on mount */
  useEffect(() => {
    const timer = setTimeout(() => {
      const id = "fora-opening"
      setMessages([
        {
          id,
          sender: "fora",
          content:
            "Tell me how you currently remind customers about unpaid invoices.\n\nFor example: do you send emails after the due date, call them, or have a collections team handle it?",
        },
      ])
      setNewMessageId(id)
      setShowTyping(false)
      setPhase("awaiting-first-input")
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  /* Helper: add Fora message after typing animation */
  const foraReply = useCallback(
    (content: React.ReactNode, nextPhase: ConversationPhase, delay = 2000) => {
      setShowTyping(true)
      setTimeout(() => {
        setShowTyping(false)
        const id = nextId("fora")
        const msg: ChatMessage = { id, sender: "fora", content }
        setMessages((prev) => [...prev, msg])
        setNewMessageId(id)
        setPhase(nextPhase)
      }, delay)
    },
    [nextId]
  )

  /* Add a user message bubble */
  const addUserMessage = useCallback(
    (text: string) => {
      const id = nextId("user")
      setMessages((prev) => [...prev, { id, sender: "user", content: text }])
      setNewMessageId(id)
    },
    [nextId]
  )

  /* Handle free-text submit */
  function handleSendMessage() {
    const text = inputValue.trim()
    if (!text) return

    setInputValue("")
    addUserMessage(text)

    // Route based on current phase
    if (phase === "awaiting-first-input") {
      memoryRef.current.currentProcess = text
      setPhase("interpreting")
      foraReply(
        `Got it. It sounds like your current approach is mostly reactive \u2014 reminders go out after invoices are already overdue.\n\nThat\u2019s common in B2B, but it often means cash comes in slower than it needs to.\n\nWould you like to add a gentle reminder before the due date? Sending a nudge 3 days early can reduce overdue invoices by up to 40%.`,
        "pre-due-question",
        2400
      )
    } else {
      // For other phases, treat free text as a selection
      handleFreeTextForPhase(text)
    }
  }

  /* Map free text to phase actions */
  function handleFreeTextForPhase(text: string) {
    const lower = text.toLowerCase()

    switch (phase) {
      case "pre-due-question": {
        const wantsPreDue =
          lower.includes("yes") ||
          lower.includes("add") ||
          lower.includes("before") ||
          lower.includes("pre")
        handlePreDueChoice(wantsPreDue)
        break
      }
      case "follow-up-question": {
        const match = text.match(/\d/)
        const count = match ? match[0] : "2"
        handleFollowUpChoice(count)
        break
      }
      case "tone-question": {
        const wantsEscalation =
          lower.includes("yes") ||
          lower.includes("escalat") ||
          lower.includes("gradual")
        handleToneChoice(wantsEscalation)
        break
      }
      case "segment-question": {
        handleSegmentChoice(text)
        break
      }
    }
  }

  /* ---- Phase handlers with memory & reasoning ---- */

  function handlePreDueChoice(addPreDue: boolean) {
    memoryRef.current.addPreDue = addPreDue
    setPhase("post-pre-due")

    if (addPreDue) {
      foraReply(
        `Smart choice. A pre-due reminder works because it catches invoices before they slip into overdue status \u2014 customers pay while it\u2019s still top of mind.\n\nNow, how many follow-up reminders would you like after the due date? Most B2B teams find 2\u20133 is the sweet spot.`,
        "follow-up-question",
        2200
      )
    } else {
      foraReply(
        `Understood \u2014 we\u2019ll keep reminders post-due only. That can work well if your customers are generally reliable payers.\n\nHow many follow-up reminders should go out after the due date?`,
        "follow-up-question",
        2200
      )
    }
  }

  function handleFollowUpChoice(count: string) {
    memoryRef.current.followUpCount = count
    setPhase("post-follow-up")

    const preRef = memoryRef.current.addPreDue
      ? "Combined with your pre-due reminder, this"
      : "This"

    foraReply(
      `${count} follow-ups \u2014 that\u2019s a good balance between persistence and patience.\n\n${preRef} creates enough touchpoints without overwhelming your customers.\n\nShould the tone escalate gradually with each reminder? Starting friendly and shifting to more direct language after 7 days typically improves recovery rates by 15\u201320%.`,
      "tone-question",
      2200
    )
  }

  function handleToneChoice(escalate: boolean) {
    memoryRef.current.toneStyle = escalate ? "escalating" : "consistent"
    setPhase("post-tone")

    if (escalate) {
      foraReply(
        `Great call. Escalating tone signals urgency without burning bridges \u2014 the first reminder stays warm, and later ones get progressively more direct.\n\nLast question: who should these reminders apply to?`,
        "segment-question",
        2200
      )
    } else {
      foraReply(
        `Got it \u2014 a consistent, professional tone throughout. That works particularly well for maintaining long-term customer relationships.\n\nLast question: who should these reminders apply to?`,
        "segment-question",
        2200
      )
    }
  }

  function handleSegmentChoice(segment: string) {
    memoryRef.current.segment = segment
    setPhase("post-segment")

    const mem = memoryRef.current
    const toneNote =
      mem.toneStyle === "escalating"
        ? "with gradually escalating tone"
        : "with a consistent professional tone"

    const segmentLabel = segment.toLowerCase().includes("enterprise")
      ? "Enterprise customers"
      : segment.toLowerCase().includes("smb")
        ? "SMB customers"
        : "all customers"

    const formalNote = segment.toLowerCase().includes("enterprise")
      ? " Since this targets Enterprise customers, I\u2019ll keep the language more formal."
      : ""

    foraReply(
      `Perfect. Here\u2019s what I\u2019m building for you:\n\n\u2022 ${mem.addPreDue ? "Pre-due reminder + " : ""}${mem.followUpCount} post-due follow-ups\n\u2022 Applied to ${segmentLabel} ${toneNote}${formalNote}\n\nLet me put this strategy together\u2026`,
      "wrapping-up",
      2400
    )

    // Navigate after the wrap-up message
    setTimeout(() => {
      setPhase("navigating")
    }, 4800)
    setTimeout(() => {
      router.push("/receivables/setup/summary")
    }, 6000)
  }

  /* Handle quick-reply button click */
  function handleQuickReply(option: string) {
    addUserMessage(option)

    switch (phase) {
      case "pre-due-question":
        handlePreDueChoice(option.toLowerCase().includes("add") || option.toLowerCase().includes("yes"))
        break
      case "follow-up-question":
        handleFollowUpChoice(option)
        break
      case "tone-question":
        handleToneChoice(option.toLowerCase().includes("yes") || option.toLowerCase().includes("escalat"))
        break
      case "segment-question":
        handleSegmentChoice(option)
        break
    }
  }

  /* Quick-reply options per phase */
  function getQuickReplies(): string[] | null {
    switch (phase) {
      case "pre-due-question":
        return ["Add a pre-due reminder", "Keep it post-due only"]
      case "follow-up-question":
        return ["1", "2", "3"]
      case "tone-question":
        return ["Yes, escalate gradually", "Keep tone consistent"]
      case "segment-question":
        return ["All customers", "Enterprise only", "SMB only"]
      default:
        return null
    }
  }

  const quickReplies = getQuickReplies()
  const isInputPhase =
    phase === "awaiting-first-input" ||
    phase === "pre-due-question" ||
    phase === "follow-up-question" ||
    phase === "tone-question" ||
    phase === "segment-question"

  const placeholders: Partial<Record<ConversationPhase, string>> = {
    "awaiting-first-input":
      'e.g. "We email customers a week after the invoice is overdue"',
    "pre-due-question": 'Type your answer or pick an option above...',
    "follow-up-question": 'Type a number or pick an option above...',
    "tone-question": 'Type your preference or pick an option above...',
    "segment-question": 'Type a segment or pick an option above...',
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center border-b border-[#e2e8f0] px-6 py-4">
        <div className="flex items-center gap-3">
          <ForaAvatar />
          <div>
            <h1 className="text-sm font-semibold text-[#0f172a]">
              Create Reminder Policy
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Conversational setup with Fora
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

          {showTyping && <TypingIndicator />}

          {quickReplies && !showTyping && (
            <QuickReplies
              options={quickReplies}
              onSelect={handleQuickReply}
            />
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom input area -- always visible */}
      <div className="border-t border-[#e2e8f0] bg-[#fafbfc]">
        <div className="mx-auto w-full max-w-2xl px-6 py-4">
          {isInputPhase ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  placeholders[phase] || "Type a message..."
                }
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
          ) : phase === "navigating" ? (
            <div className="flex items-center justify-center gap-2.5 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Preparing your strategy...</span>
            </div>
          ) : (
            <p className="text-center text-xs text-[#94a3b8]">
              {phase === "wrapping-up"
                ? "Putting your strategy together..."
                : "\u00A0"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
