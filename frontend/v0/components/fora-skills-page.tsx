"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Tags,
  Handshake,
  ShieldAlert,
  MessageSquare,
  Upload,
  FileText,
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
import { api, type Skill as APISkill } from "@/lib/api"

/* ------------------------------------------------------------------ */
/*  UI Skill type (extends API data with local UI state)               */
/* ------------------------------------------------------------------ */
interface UISkill {
  id: string
  name: string
  description: string
  icon: React.ElementType
  enabled: boolean
  mode: "suggest" | "act"
  hasContext: boolean
  contextText: string
}

const SKILL_ICONS: Record<string, React.ElementType> = {
  classification: Tags,
  promise_to_pay: Handshake,
  dispute:        ShieldAlert,
  reply:          MessageSquare,
}

function toUISkill(s: APISkill): UISkill {
  return {
    id:          s.id,
    name:        s.name,
    description: s.description,
    icon:        SKILL_ICONS[s.id] ?? Tags,
    enabled:     true,
    mode:        "suggest",
    hasContext:  s.has_context,
    contextText: s.context,
  }
}

/* ------------------------------------------------------------------ */
/*  Skill-aware content                                                */
/* ------------------------------------------------------------------ */
const SKILL_DESCRIPTIONS: Record<string, string> = {
  classification:
    "Classify incoming AR conversations into the right case type so the right workflow is triggered.",
  promise_to_pay:
    "Define how payment commitments should be handled, recorded, and escalated.",
  dispute:
    "Handle customer disputes about invoice amounts or charges, including escalation rules.",
  reply:
    "Define tone, sign-off style, and communication rules for all customer replies.",
}

const SKILL_PLACEHOLDERS: Record<string, string> = {
  classification: `Example:
- Case types: Clarification, Promise to Pay, Payment Method Update, Dispute, General Follow-up.
- If customer asks 'why was I charged' or 'need breakdown' → Clarification.
- If customer states 'will pay on <date>' → Promise to Pay.
- If customer claims 'wrong amount' or threatens escalation → Dispute.
- If confidence is ambiguous → ask one clarifying question before assigning.`,
  promise_to_pay: `Example:
- Record commitment date and amount (if partial).
- Allow max 7-day extension for first request.
- Escalate if overdue > 60 days or customer breaks 2 commitments.
- If customer doesn't specify a date → ask for a specific date before confirming.`,
  dispute: `Example:
- Always CC legal@company.com for disputes over $10,000.
- Require written reason before pausing reminders.
- Escalate to account manager if dispute remains open > 30 days.
- Do not offer refunds without finance team approval.`,
  reply: `Example:
- Always use formal language. Never use contractions.
- Sign off with 'Yours sincerely' instead of 'Best regards'.
- Never make commitments on behalf of the finance team.
- Keep replies under 150 words where possible.`,
}

const SKILL_FIRST_MESSAGE: Record<string, string> = {
  classification:
    "I'll help you set up intent classification for incoming AR messages.\nWhat case types do you want, and what are the top signals for each?",
  promise_to_pay:
    "I'll help you define how payment commitments should be handled.\nWhat's your current process for recording PTP dates, and when do you escalate?",
  dispute:
    "I'll help you define how disputes should be handled.\nWhat are your escalation rules and documentation requirements for disputed invoices?",
  reply:
    "I'll help you configure your reply style and tone.\nWhat's your preferred sign-off, and are there any phrases or commitments to avoid?",
}

const SKILL_CHIPS: Record<string, string[]> = {
  classification:  ["List my case types", "Rules for ambiguous intent", "Priority order", "Keywords per type"],
  promise_to_pay:  ["Extension limits", "Escalation rules", "Partial payments", "Broken commitments"],
  dispute:         ["Escalation thresholds", "Documentation rules", "Legal CC rules", "Resolution timeline"],
  reply:           ["Tone and formality", "Sign-off style", "Prohibited phrases", "Signature format"],
}

/* ------------------------------------------------------------------ */
/*  Tiny Chip                                                          */
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
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "primary" && "bg-blue-100 text-blue-800"
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Segmented Control                                                  */
/* ------------------------------------------------------------------ */
function Seg({
  value,
  onChange,
  options,
  size = "sm",
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  size?: "sm" | "md"
}) {
  return (
    <div className="inline-flex items-center rounded-md bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
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
/*  Skill Row                                                          */
/* ------------------------------------------------------------------ */
function SkillRow({
  skill,
  onToggle,
  onConfigure,
}: {
  skill: UISkill
  onToggle: (enabled: boolean) => void
  onConfigure: () => void
}) {
  const Icon = skill.icon
  const off = !skill.enabled

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest("button[role='switch']")) return
        onConfigure()
      }}
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-border px-4 py-3.5 cursor-pointer transition-colors",
        off ? "opacity-[0.85] bg-muted/30" : "hover:bg-muted/50"
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
          onClick={(e) => { e.stopPropagation(); onConfigure() }}
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
/*  Reference doc type                                                 */
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
  saving,
}: {
  skill: UISkill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updates: Partial<UISkill>) => Promise<void>
  saving: boolean
}) {
  const [localMode, setLocalMode] = useState<"suggest" | "act">("suggest")
  const [contextText, setContextText] = useState("")
  const [docs, setDocs] = useState<RefDoc[]>([])
  const [dragOver, setDragOver] = useState(false)

  const isDirty = skill
    ? localMode !== skill.mode || contextText !== skill.contextText
    : false

  useEffect(() => {
    if (open && skill) {
      setLocalMode(skill.mode)
      setContextText(skill.contextText)
      setDocs([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skill?.id])

  function handleOpenChange(val: boolean) {
    onOpenChange(val)
  }

  async function handleSave() {
    if (!skill) return
    await onSave(skill.id, {
      mode: localMode,
      contextText: contextText.trim(),
      hasContext: contextText.trim().length > 0,
    })
    onOpenChange(false)
  }

  function handleDocUpload(fileName: string) {
    setDocs((prev) => [
      ...prev,
      { id: `doc-${Date.now()}`, name: fileName, extract: false, reference: false, status: "not-used" },
    ])
  }

  function updateDocOption(id: string, choice: "extract" | "reference") {
    setDocs((prev) =>
      prev.map((d) =>
        d.id !== id ? d : {
          ...d,
          extract: choice === "extract",
          reference: choice === "reference",
          status: choice === "extract" ? "extracted" : "referenced",
        }
      )
    )
  }

  if (!skill) return null

  const Icon = skill.icon
  const placeholder = SKILL_PLACEHOLDERS[skill.id] ?? "Define how this skill should behave..."
  const description = SKILL_DESCRIPTIONS[skill.id] ?? skill.description

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-[680px] p-0 gap-0 shadow-lg border-l border-border"
      >
        {/* Header */}
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

        {/* Operating mode */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">Operating mode</p>
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

        <div className="border-b border-border" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-10 px-6 py-6">

            {/* Business Context */}
            <section>
              <h3 className="text-sm font-semibold text-foreground">Business Context</h3>
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
                Plain language is fine. Fora will follow these rules strictly.
              </p>
            </section>

            {/* Documents */}
            <section>
              <h3 className="text-sm font-semibold text-foreground">Documents</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Attach policy or process documents. Choose to extract context or let Fora reference them during execution.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
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
                onClick={() => document.getElementById("ref-doc-upload")?.click()}
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
                <p className="mt-2 text-xs font-medium text-foreground">Drop files here or click to browse</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">PDF, DOCX, TXT</p>
              </div>

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
                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`doc-option-${doc.id}`}
                            checked={doc.extract}
                            onChange={() => updateDocOption(doc.id, "extract")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <span className="text-[11px] text-muted-foreground">Extract context</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`doc-option-${doc.id}`}
                            checked={doc.reference}
                            onChange={() => updateDocOption(doc.id, "reference")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <span className="text-[11px] text-muted-foreground">Reference</span>
                        </label>
                      </div>
                      <Chip
                        variant={
                          doc.status === "extracted" ? "success"
                          : doc.status === "referenced" ? "primary"
                          : "neutral"
                        }
                      >
                        {doc.status === "extracted" ? "Extracted"
                          : doc.status === "referenced" ? "Referenced"
                          : "Not used"}
                      </Chip>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Sticky save footer */}
        <div className="border-t border-border bg-background px-6 py-4 flex items-center justify-end gap-2">
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
            className="text-xs h-9 px-5 shadow-sm disabled:opacity-50"
            disabled={!isDirty || saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save Context"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
type Filter = "enabled" | "needs-context" | "act-mode"

export function ForaSkillsPage() {
  const [skills, setSkills] = useState<UISkill[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<UISkill | null>(null)
  const [saving, setSaving] = useState(false)
  const [defaultMode, setDefaultMode] = useState<"suggest" | "act">("suggest")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<Filter[]>([])

  useEffect(() => {
    api.skills.list()
      .then((apiSkills) => setSkills(apiSkills.map(toUISkill)))
      .finally(() => setLoading(false))
  }, [])

  const filteredSkills = useMemo(() => {
    let list = skills
    const q = searchQuery.toLowerCase().trim()
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    if (activeFilters.includes("enabled")) list = list.filter((s) => s.enabled)
    if (activeFilters.includes("needs-context")) list = list.filter((s) => !s.hasContext)
    if (activeFilters.includes("act-mode")) list = list.filter((s) => s.mode === "act")
    return list
  }, [skills, searchQuery, activeFilters])

  function toggleFilter(f: Filter) {
    setActiveFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])
  }

  function handleToggle(id: string, enabled: boolean) {
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, enabled } : s))
  }

  async function handleSave(id: string, updates: Partial<UISkill>) {
    setSaving(true)
    try {
      const contextText = updates.contextText ?? ""
      if (contextText.trim()) {
        await api.skills.updateContext(id, contextText.trim())
      } else {
        await api.skills.clearContext(id)
      }
      setSkills((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s))
      toast.success("Changes saved.")
    } catch {
      toast.error("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function openDrawer(skill: UISkill) {
    setActiveSkill(skill)
    setDrawerOpen(true)
  }

  const drawerSkill = activeSkill
    ? skills.find((s) => s.id === activeSkill.id) ?? activeSkill
    : null

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Fora Skills</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure how your AI collections co-worker operates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Default mode</span>
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

      {/* Filter bar */}
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
        <FilterChip label="Enabled" active={activeFilters.includes("enabled")} onClick={() => toggleFilter("enabled")} />
        <FilterChip label="Needs context" active={activeFilters.includes("needs-context")} onClick={() => toggleFilter("needs-context")} />
        <FilterChip label="Act mode" active={activeFilters.includes("act-mode")} onClick={() => toggleFilter("act-mode")} />
      </div>

      {/* Skill list */}
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

      {/* Add your own skill */}
      <div className="mt-2 flex items-center justify-between rounded-lg px-4 py-3 border border-dashed border-primary/20 bg-primary/[0.02]">
        <div>
          <h2 className="text-xs font-semibold text-foreground">Add Your Own Skill</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Design custom workflows tailored to your process.
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">Coming soon</Badge>
      </div>

      {/* Configuration drawer */}
      <ConfigDrawer
        skill={drawerSkill}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
