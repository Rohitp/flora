"use client"

import { useState, useMemo } from "react"
import {
  Tags,
  Handshake,
  CreditCard,
  Plus,
  Upload,
  FileText,
  Send,
  Search,
  Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
interface Skill {
  id: string
  name: string
  description: string
  icon: React.ElementType
  enabled: boolean
  mode: "suggest" | "act"
  confidenceThreshold: number
  hasContext: boolean
  contextText: string
  lastUpdated?: string
}

const initialSkills: Skill[] = [
  {
    id: "classification",
    name: "Classification",
    description:
      "Reads incoming cases and determines type based on customer intent.",
    icon: Tags,
    enabled: true,
    mode: "suggest",
    confidenceThreshold: 85,
    hasContext: false,
    contextText: "",
    lastUpdated: "3 days ago",
  },
  {
    id: "promise-to-pay",
    name: "Promise to Pay",
    description:
      "Responds to PTP requests, confirms amounts, and records commitment dates.",
    icon: Handshake,
    enabled: true,
    mode: "act",
    confidenceThreshold: 85,
    hasContext: true,
    contextText: "Allow up to 7-day extension for first PTP request.",
    lastUpdated: "2 days ago",
  },
  {
    id: "change-payment-method",
    name: "Change Payment Method",
    description:
      "Handles requests to update payment method, including secure update links.",
    icon: CreditCard,
    enabled: false,
    mode: "suggest",
    confidenceThreshold: 80,
    hasContext: false,
    contextText: "",
    lastUpdated: "1 week ago",
  },
]

/* ------------------------------------------------------------------ */
/*  Tiny Chip (display-only)                                           */
/* ------------------------------------------------------------------ */
function Chip({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode
  variant?: "neutral" | "success" | "warning" | "primary"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none whitespace-nowrap",
        variant === "neutral" && "bg-muted text-foreground/70",
        variant === "success" &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
        variant === "warning" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
        variant === "primary" && "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400"
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Segmented Control (used in drawer + header)                        */
/* ------------------------------------------------------------------ */
function Seg({
  value,
  onChange,
  options,
  disabled,
  size = "sm",
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  size?: "sm" | "md"
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md bg-muted p-0.5",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded px-2.5 py-1 font-medium transition-all",
            size === "sm" ? "text-[11px]" : "text-xs",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter Chip                                                        */
/* ------------------------------------------------------------------ */
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Skill Row (clean status summary)                                   */
/* ------------------------------------------------------------------ */
function SkillRow({
  skill,
  onToggle,
  onConfigure,
}: {
  skill: Skill
  onToggle: (enabled: boolean) => void
  onConfigure: () => void
}) {
  const Icon = skill.icon
  const off = !skill.enabled

  return (
    <div
      onClick={(e) => {
        // Don't open drawer if clicking the toggle switch
        const target = e.target as HTMLElement
        if (target.closest("[data-slot='switch']") || target.closest("button[role='switch']")) return
        onConfigure()
      }}
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-border px-4 py-3.5 cursor-pointer transition-colors",
        off
          ? "opacity-[0.85] bg-muted/30"
          : "hover:bg-muted/50 hover:border-border"
      )}
    >
      {/* LEFT: icon + text + chips */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            skill.enabled ? "bg-primary/10" : "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              skill.enabled ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-foreground leading-none truncate">
            {skill.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-snug truncate">
            {skill.description}
          </p>
          {/* Status chips */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <Chip variant={skill.mode === "act" ? "primary" : "neutral"}>
              {skill.mode === "suggest" ? "Suggest" : "Act"}
            </Chip>
            <Chip variant={skill.hasContext ? "success" : "warning"}>
              {skill.hasContext ? "Context added" : "No context"}
            </Chip>

          </div>
        </div>
      </div>

      {/* RIGHT: toggle + configure */}
      <div className="flex items-center gap-3 shrink-0">
        <Switch
          checked={skill.enabled}
          onCheckedChange={onToggle}
          className="scale-[0.85]"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onConfigure()
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground group-hover:text-muted-foreground"
          aria-label={`Configure ${skill.name}`}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skill-aware content maps                                           */
/* ------------------------------------------------------------------ */
const SKILL_DESCRIPTIONS: Record<string, string> = {
  classification:
    "Classify incoming AR conversations into the right case type (e.g., Clarification, Promise to Pay, Payment Method Update, Dispute) so the right workflow is triggered.",
  "promise-to-pay":
    "Define how payment commitments should be handled, recorded, and escalated.",
  "change-payment-method":
    "Define how secure payment method updates should be requested and handled.",
}

const SKILL_PLACEHOLDERS: Record<string, string> = {
  classification: `Example:
- Case types: Clarification, Promise to Pay, Payment Method Update, Dispute, Refund/Chargeback, General Follow-up.
- Classification rules:
  - If customer asks 'why was I charged', 'invoice doesn't match', or 'need breakdown' \u2192 Clarification.
  - If customer states 'will pay on <date>' or requests more time \u2192 Promise to Pay.
  - If customer requests 'update card', 'change payment method', 'my card expired' \u2192 Payment Method Update.
  - If customer claims 'wrong amount', 'service not delivered', 'cancelled', or threatens escalation \u2192 Dispute.
- Priority rules:
  - Dispute > Payment Method Update > Promise to Pay > Clarification > Follow-up.
- Confidence handling:
  - If confidence < threshold or intent ambiguous \u2192 ask one clarifying question before assigning a case type.`,
  "promise-to-pay": `Example:
- Record commitment date and amount (if partial).
- Allow max 7-day extension for first request.
- Escalate if overdue > 60 days or if customer breaks 2 commitments.
- If customer doesn\u2019t specify a date \u2192 ask for a specific date before confirming.`,
  "change-payment-method": `Example:
- Never request card details in chat/email.
- Always send secure update link.
- If enterprise / high-value account \u2192 route to support + notify owner.
- If multiple failed payments in 7 days \u2192 suggest retry schedule and notify.`,
}

const SKILL_FIRST_MESSAGE: Record<string, string> = {
  classification:
    "I'll help you set up intent classification for incoming AR messages.\nWhat case types do you want, and what are the top signals for each?\nFor example: 'I'll pay next week' \u2192 Promise to Pay.",
  "promise-to-pay":
    "I'll help you define how payment commitments should be handled.\nWhat\u2019s your current process for recording PTP dates, and when do you escalate?",
  "change-payment-method":
    "I'll help you build rules for payment method update requests.\nHow do you currently handle secure link generation, and are there special rules for enterprise accounts?",
}

const SKILL_CHIPS: Record<string, string[]> = {
  classification: [
    "List my case types",
    "Rules for ambiguous intent",
    "Priority order",
    "Keywords per type",
  ],
  "promise-to-pay": [
    "Extension limits",
    "Escalation rules",
    "Partial payments",
    "Broken commitments",
  ],
  "change-payment-method": [
    "Secure link flow",
    "Enterprise routing",
    "Failed payment retry",
    "Notification rules",
  ],
}

/* ------------------------------------------------------------------ */
/*  Chat message type                                                  */
/* ------------------------------------------------------------------ */
type ChatMsg =
  | { role: "user" | "assistant"; content: string; type?: undefined }
  | { role: "assistant"; type: "proposal"; content: string }

/* ------------------------------------------------------------------ */
/*  Reference document type                                            */
/* ------------------------------------------------------------------ */
interface RefDoc {
  id: string
  name: string
  extract: boolean
  reference: boolean
  status: "extracted" | "referenced" | "not-used"
}

/* ------------------------------------------------------------------ */
/*  Configuration Drawer                                               */
/* ------------------------------------------------------------------ */
function ConfigDrawer({
  skill,
  open,
  onOpenChange,
  onSave,
}: {
  skill: Skill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updates: Partial<Skill>) => void
}) {
  /* ── Local working state ── */
  const [localMode, setLocalMode] = useState<"suggest" | "act">("suggest")
  const [contextText, setContextText] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState("")
  const [docs, setDocs] = useState<RefDoc[]>([])
  const [dragOver, setDragOver] = useState(false)

  /* ── Dirty detection ── */
  const isDirty = skill
    ? localMode !== skill.mode ||
      contextText !== skill.contextText
    : false

  /* ── Reset on open ── */
  function handleOpenChange(val: boolean) {
    if (val && skill) {
      setLocalMode(skill.mode)
      setContextText(skill.contextText)
      setChatMessages([
        {
          role: "assistant",
          content:
            SKILL_FIRST_MESSAGE[skill.id] ||
            "I'll help you define how this skill should behave. Tell me about your business rules and I'll structure them into a policy.",
        },
      ])
      setChatInput("")
      setDocs([])
    }
    onOpenChange(val)
  }

  function handleSave() {
    if (!skill) return
    onSave(skill.id, {
      mode: localMode,
      contextText: contextText.trim(),
      hasContext: contextText.trim().length > 0,
    })
    onOpenChange(false)
  }

  function handleChatSend() {
    if (!chatInput.trim() || !skill) return
    const userMsg = chatInput.trim()
    setChatInput("")

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      {
        role: "assistant",
        type: "proposal",
        content:
          skill.id === "classification"
            ? "- If customer asks 'why was I charged' or 'need breakdown' \u2192 Clarification.\n- If customer states 'will pay on <date>' \u2192 Promise to Pay.\n- Dispute > PTP > Clarification in priority."
            : skill.id === "promise-to-pay"
              ? "- Allow max 7-day extension for first PTP request.\n- Escalate if overdue > 60 days or 2 broken commitments.\n- Always confirm specific date before recording."
              : "- Never request card details in chat/email.\n- Send secure update link automatically.\n- Route enterprise accounts to support + notify owner.",
      },
    ])
  }

  function handleApplyProposal(text: string) {
    setContextText((prev) =>
      prev ? prev + "\n" + text : text
    )
    toast.success("Applied to context.")
  }

  function handleDocUpload(fileName: string) {
    setDocs((prev) => [
      ...prev,
      {
        id: `doc-${Date.now()}`,
        name: fileName,
        extract: false,
        reference: false,
        status: "not-used",
      },
    ])
  }

  function updateDocOption(id: string, choice: "extract" | "reference") {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        return {
          ...d,
          extract: choice === "extract",
          reference: choice === "reference",
          status: choice === "extract" ? "extracted" : "referenced",
        }
      })
    )
  }

  if (!skill) return null

  const Icon = skill.icon
  const placeholder = SKILL_PLACEHOLDERS[skill.id] || "Define how this skill should behave..."
  const description = SKILL_DESCRIPTIONS[skill.id] || skill.description
  const chips = SKILL_CHIPS[skill.id] || ["Define rules", "Escalation process", "Exceptions"]

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-[680px] p-0 gap-0 shadow-lg border-l border-border"
      >
        {/* ── Header (skill-aware) ── */}
        <SheetHeader className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-sm">{skill.name}</SheetTitle>
              <SheetDescription className="text-xs mt-1 leading-relaxed">
                {description}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b border-border" />

        {/* ── Operating Controls (compact) ── */}
        <div className="px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">
                Operating mode
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Suggest queues for review. Take action executes automatically.
              </p>
            </div>
            <Seg
              value={localMode}
              onChange={(v) => setLocalMode(v as "suggest" | "act")}
              options={[
                { value: "suggest", label: "Suggest" },
                { value: "act", label: "Take action" },
              ]}
              size="md"
            />
          </div>


        </div>

        <div className="border-b border-border" />

        {/* ── Context Authoring Workspace (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-10 px-6 py-6">

            {/* ──────── SECTION 1: BUSINESS CONTEXT (hero) ──────── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Business Context
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Customize how Fora should apply this skill, in the context of your business.
              </p>
              <Textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                rows={10}
                className="mt-3 min-h-[220px] resize-vertical text-xs leading-relaxed placeholder:text-muted-foreground/50 font-mono bg-background border-border p-4"
                placeholder={placeholder}
              />
              <p className="mt-2 text-[11px] text-muted-foreground/80 leading-relaxed">
                Fora follows this context when executing this skill.
                {docs.length > 0 &&
                  " If documents are attached, Fora will reference them only when you allow it."}
              </p>
            </section>



            {/* ──────── SECTION 3: DOCUMENTS (optional) ──────── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Documents
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Attach policy or process documents. For each document, choose to extract context from it or let Fora reference it during execution.
              </p>

              {/* Upload area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleDocUpload(file.name)
                }}
                className={cn(
                  "mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                )}
                onClick={() =>
                  document.getElementById("ref-doc-upload")?.click()
                }
              >
                <input
                  type="file"
                  id="ref-doc-upload"
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleDocUpload(file.name)
                    e.target.value = ""
                  }}
                />
                <Upload className="h-5 w-5 text-muted-foreground/60" />
                <p className="mt-2 text-xs font-medium text-foreground">
                  Drop files here or click to browse
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  PDF, DOCX, TXT
                </p>
              </div>

              {/* Uploaded doc rows */}
              {docs.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                        {doc.name}
                      </span>

                      {/* Options (mutually exclusive) */}
                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`doc-option-${doc.id}`}
                            checked={doc.extract}
                            onChange={() =>
                              updateDocOption(doc.id, "extract")
                            }
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            Extract context
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`doc-option-${doc.id}`}
                            checked={doc.reference}
                            onChange={() =>
                              updateDocOption(doc.id, "reference")
                            }
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            Reference
                          </span>
                        </label>
                      </div>

                      {/* Status badge */}
                      <Chip
                        variant={
                          doc.status === "extracted"
                            ? "success"
                            : doc.status === "referenced"
                              ? "primary"
                              : "neutral"
                        }
                      >
                        {doc.status === "extracted"
                          ? "Extracted"
                          : doc.status === "referenced"
                            ? "Referenced"
                            : "Not used"}
                      </Chip>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ── Sticky Save Footer ── */}
        <div className="border-t border-border bg-background px-6 py-4 flex items-center justify-between">
          {skill.lastUpdated ? (
            <p className="text-[11px] text-muted-foreground">
              Last updated: {skill.lastUpdated}
            </p>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-9 text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs h-9 px-5 shadow-sm disabled:opacity-50 disabled:border-border"
              disabled={!isDirty}
              onClick={handleSave}
            >
              Save Context
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
type Filter = "enabled" | "needs-context" | "act-mode"

export default function ForaSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)
  const [defaultMode, setDefaultMode] = useState<"suggest" | "act">("suggest")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<Filter[]>([])

  /* ── Filtering ── */
  const filteredSkills = useMemo(() => {
    let list = skills
    const q = searchQuery.toLowerCase().trim()
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      )
    }
    if (activeFilters.includes("enabled"))
      list = list.filter((s) => s.enabled)
    if (activeFilters.includes("needs-context"))
      list = list.filter((s) => !s.hasContext)
    if (activeFilters.includes("act-mode"))
      list = list.filter((s) => s.mode === "act")
    return list
  }, [skills, searchQuery, activeFilters])

  function toggleFilter(f: Filter) {
    setActiveFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    )
  }

  /* ── Keep drawer synced with latest skill data ── */
  const drawerSkill = activeSkill
    ? skills.find((s) => s.id === activeSkill.id) ?? activeSkill
    : null

  /* ── Handlers ── */
  function handleToggle(id: string, enabled: boolean) {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s))
    )
  }

  function handleSave(id: string, updates: Partial<Skill>) {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
    toast.success("Changes saved.")
  }

  function openDrawer(skill: Skill) {
    setActiveSkill(skill)
    setDrawerOpen(true)
  }

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Fora Skills
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure how your AI collections co-worker operates.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Default mode
            </span>
            <Seg
              value={defaultMode}
              onChange={(v) => setDefaultMode(v as "suggest" | "act")}
              options={[
                { value: "suggest", label: "Suggest" },
                { value: "act", label: "Act" },
              ]}
            />
          </div>

        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="h-8 pl-8 text-xs border-border focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <FilterChip
          label="Enabled"
          active={activeFilters.includes("enabled")}
          onClick={() => toggleFilter("enabled")}
        />
        <FilterChip
          label="Needs context"
          active={activeFilters.includes("needs-context")}
          onClick={() => toggleFilter("needs-context")}
        />
        <FilterChip
          label="Act mode"
          active={activeFilters.includes("act-mode")}
          onClick={() => toggleFilter("act-mode")}
        />
      </div>

      {/* ── Skill List ── */}
      <div className="mt-4 flex flex-col gap-2">
        {filteredSkills.map((skill) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            onToggle={(enabled) => handleToggle(skill.id, enabled)}
            onConfigure={() => openDrawer(skill)}
          />
        ))}

        {filteredSkills.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No skills match your filters.
          </div>
        )}
      </div>

      {/* ── Add Your Own Skill ── */}
      <div className="mt-2 flex items-center justify-between rounded-lg px-4 py-3 border border-dashed border-primary/20 bg-primary/[0.02]">
        <div>
          <h2 className="text-xs font-semibold text-foreground">
            Add Your Own Skill
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Design custom workflows tailored to your process.
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Coming soon
        </Badge>
      </div>

      {/* ── Configuration Drawer ── */}
      <ConfigDrawer
        skill={drawerSkill}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSave={handleSave}
      />
    </div>
  )
}
