"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
          "max-w-[480px] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
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

function OptionButtons({ options, onSelect }: { options: string[]; onSelect: (o: string) => void }) {
  return (
    <div className="ml-11 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-medium text-[#334155] shadow-sm transition-all hover:border-[#3b82f6] hover:bg-[#f8fafc] hover:text-[#3b82f6] active:scale-[0.98]"
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export default function CreateWithAIPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<ConversationPhase>("opening")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showTyping, setShowTyping] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [newMessageId, setNewMessageId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const msgCounter = useRef(0)

  const nextId = useCallback((prefix: string) => {
    msgCounter.current++
    return `${prefix}-${msgCounter.current}`
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, showTyping])

  useEffect(() => {
    if (phase === "awaiting-first-input") inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    const timer = setTimeout(() => {
      const id = "fora-opening"
      setMessages([{ id, sender: "fora", content: "Tell me how you currently handle unpaid invoices." }])
      setNewMessageId(id)
      setShowTyping(false)
      setPhase("awaiting-first-input")
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  const foraReply = useCallback(
    (content: React.ReactNode, nextPhase: ConversationPhase, delay = 1800) => {
      setShowTyping(true)
      setTimeout(() => {
        setShowTyping(false)
        const id = nextId("fora")
        setMessages((prev) => [...prev, { id, sender: "fora", content }])
        setNewMessageId(id)
        setPhase(nextPhase)
      }, delay)
    },
    [nextId]
  )

  function handleSendMessage() {
    const text = inputValue.trim()
    if (!text || phase !== "awaiting-first-input") return
    setInputValue("")
    const id = nextId("user")
    setMessages((prev) => [...prev, { id, sender: "user", content: text }])
    setNewMessageId(id)
    setPhase("interpreting")
    foraReply(
      "Got it. So reminders only go out after invoices become overdue.\nThat\u2019s common in B2B \u2014 but it often delays payments.\n\nWould you like to add a reminder before the due date to reduce overdue invoices?",
      "pre-due-question",
      2200
    )
  }

  function handleSelect(option: string, currentPhase: ConversationPhase) {
    const id = nextId("user")
    setMessages((prev) => [...prev, { id, sender: "user", content: option }])
    setNewMessageId(id)

    switch (currentPhase) {
      case "pre-due-question":
        setPhase("post-pre-due")
        if (option.startsWith("Add a reminder")) {
          foraReply(
            "Smart move. A gentle nudge before the due date can significantly reduce overdue rates.\n\nHow many follow-up reminders would you like after the due date?",
            "follow-up-question",
            1800
          )
        } else {
          foraReply(
            "Understood. We\u2019ll keep reminders post-due only.\n\nHow many follow-up reminders would you like after the due date?",
            "follow-up-question",
            1800
          )
        }
        break
      case "follow-up-question":
        setPhase("post-follow-up")
        foraReply(
          `${option} follow-ups \u2014 noted.\n\nShould the tone escalate gradually? Starting friendly and getting more direct with each reminder can improve response rates.`,
          "tone-question",
          1800
        )
        break
      case "tone-question":
        setPhase("post-tone")
        if (option.startsWith("Yes")) {
          foraReply(
            "Great, we\u2019ll start warm and gradually shift to a more direct tone.\n\nOne last thing \u2014 should these reminders apply to all customers, or just a specific segment?",
            "segment-question",
            1800
          )
        } else {
          foraReply(
            "Got it \u2014 consistent, professional tone throughout.\n\nOne last thing \u2014 should these reminders apply to all customers, or just a specific segment?",
            "segment-question",
            1800
          )
        }
        break
      case "segment-question":
        setPhase("post-segment")
        foraReply(
          "Perfect. I have everything I need to set up your reminder policy.\n\nLet me put this together for you\u2026",
          "wrapping-up",
          1800
        )
        setTimeout(() => setPhase("navigating"), 3600)
        setTimeout(() => router.push("/automations/create/summary"), 4800)
        break
    }
  }

  const showInput = phase === "awaiting-first-input"

  function getButtonOptions(p: ConversationPhase): string[] | null {
    switch (p) {
      case "pre-due-question": return ["Add a reminder 3 days before due", "Keep it post-due only"]
      case "follow-up-question": return ["1", "2", "3"]
      case "tone-question": return ["Yes, escalate gradually", "Keep tone consistent"]
      case "segment-question": return ["All customers", "Enterprise only", "SMB only"]
      default: return null
    }
  }

  const buttonOptions = getButtonOptions(phase)

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center border-b border-[#e2e8f0] px-6 py-4">
        <div className="flex items-center gap-3">
          <ForaAvatar />
          <div>
            <h1 className="text-sm font-semibold text-[#0f172a]">Create Reminder Policy</h1>
            <p className="text-xs text-[#94a3b8]">Guided setup with Fora</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-8">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} isNew={msg.id === newMessageId} />
          ))}
          {showTyping && <TypingIndicator />}
          {buttonOptions && !showTyping && (
            <OptionButtons options={buttonOptions} onSelect={(opt) => handleSelect(opt, phase)} />
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="border-t border-[#e2e8f0] bg-[#fafbfc]">
        <div className="mx-auto w-full max-w-2xl px-6 py-4">
          {showInput ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage() }}
              className="flex items-center gap-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={'e.g. "We send reminders after invoices are 7 days overdue"'}
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
              <span>Setting up your configuration...</span>
            </div>
          ) : (
            <p className="text-center text-xs text-[#94a3b8]">
              {buttonOptions
                ? "Choose an option above to continue"
                : phase === "wrapping-up"
                  ? "Preparing your policy..."
                  : "\u00A0"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
