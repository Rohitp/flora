"use client"

import { useState, useEffect } from "react"
import { Tags, Handshake, ShieldAlert, MessageSquare, Plus, Pencil, Trash2, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { api, type Skill } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const SKILL_ICONS: Record<string, React.ElementType> = {
  classification:  Tags,
  promise_to_pay:  Handshake,
  dispute:         ShieldAlert,
  reply:           MessageSquare,
}

/* ------------------------------------------------------------------ */
/*  Skill Card                                                         */
/* ------------------------------------------------------------------ */
function SkillCard({
  skill,
  onEdit,
  onClear,
}: {
  skill: Skill
  onEdit: () => void
  onClear: () => void
}) {
  const Icon = SKILL_ICONS[skill.id] ?? Bot

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-[18px] w-[18px] text-foreground/70" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-foreground">{skill.name}</h3>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">
        {skill.description}
      </p>

      {skill.has_context && (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Your rules:</p>
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed line-clamp-3">
            {skill.context}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 transition-colors hover:underline"
        >
          {skill.has_context ? (
            <><Pencil className="h-3 w-3" />Edit rules</>
          ) : (
            <><Plus className="h-3 w-3" />Add rules</>
          )}
        </button>
        {skill.has_context && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit Dialog                                                        */
/* ------------------------------------------------------------------ */
function EditDialog({
  skill,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  skill: Skill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, context: string) => Promise<void>
  saving: boolean
}) {
  const [text, setText] = useState("")

  useEffect(() => {
    if (open && skill) setText(skill.context)
  }, [open, skill])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {skill?.name} — Business Rules
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-relaxed">
            Add instructions so Fora follows your team's policies for this skill.
            These are injected directly into Fora's prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            className="resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40"
            placeholder={getPlaceholder(skill?.id ?? "")}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Plain language is fine. Fora will follow these rules strictly.
          </p>
        </div>

        <DialogFooter className="mt-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!text.trim() || saving}
            onClick={async () => {
              if (skill) {
                await onSave(skill.id, text.trim())
                onOpenChange(false)
              }
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getPlaceholder(skillId: string): string {
  const map: Record<string, string> = {
    classification:
      "e.g. If a customer says they are disputing only part of the invoice, still classify as 'disputed'.\nIf an OOO auto-reply is detected, classify as 'unclear'.",
    promise_to_pay:
      "e.g. Maximum extension allowed is 15 days for enterprise customers.\nDo not allow more than 2 promise-to-pay extensions per invoice.",
    dispute:
      "e.g. Always CC legal@company.com when a dispute involves an amount over $10,000.\nRequire the customer to provide a written dispute reason before pausing reminders.",
    reply:
      "e.g. Always use formal language. Never use contractions.\nSign off with 'Yours sincerely' instead of 'Best regards'.",
  }
  return map[skillId] ?? "Add your business rules here…"
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
export function ForaSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.skills.list().then(setSkills).finally(() => setLoading(false))
  }, [])

  async function handleSave(id: string, context: string) {
    setSaving(true)
    try {
      await api.skills.updateContext(id, context)
      setSkills(prev =>
        prev.map(s => s.id === id ? { ...s, context, has_context: true } : s)
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleClear(id: string) {
    await api.skills.clearContext(id)
    setSkills(prev =>
      prev.map(s => s.id === id ? { ...s, context: "", has_context: false } : s)
    )
  }

  function openDialog(skill: Skill) {
    setActiveSkill(skill)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Fora Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fora is your AI collections co-worker. She uses these built-in skills to handle
          customer conversations. Add your business rules to each skill to control her behaviour.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {/* Skills grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={() => openDialog(skill)}
              onClear={() => handleClear(skill.id)}
            />
          ))}
        </div>

        {/* How it works */}
        <div className="mt-8 rounded-xl border border-border bg-muted/20 px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground">How it works</h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            When Fora processes an email, your rules are injected into the relevant step of her
            reasoning. For example, a rule on <strong>Promise to Pay</strong> like
            {" "}<em>"max extension is 15 days"</em> means Fora will decline a customer asking
            for 25 days and explain the limit — without any code changes.
          </p>
        </div>
      </div>

      <EditDialog
        skill={activeSkill}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
