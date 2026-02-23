"use client"

import { useState } from "react"
import { Tags, Handshake, CreditCard, Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
interface Skill {
  id: string
  name: string
  description: string
  icon: React.ElementType
  hasCustomPrompt: boolean
  customPrompt: string
}

const initialSkills: Skill[] = [
  {
    id: "classification",
    name: "Classification",
    description:
      "Reads incoming cases and determines the type based on customer intent, such as disputes, payment inquiries, or follow-ups.",
    icon: Tags,
    hasCustomPrompt: false,
    customPrompt: "",
  },
  {
    id: "promise-to-pay",
    name: "Promise to Pay",
    description:
      "Responds to promise-to-pay requests, confirms outstanding amounts, and records commitment dates based on your collection policy.",
    icon: Handshake,
    hasCustomPrompt: false,
    customPrompt: "",
  },
  {
    id: "change-payment-method",
    name: "Change Payment Method",
    description:
      "Handles customer requests to update or change their payment method, including sending secure update links.",
    icon: CreditCard,
    hasCustomPrompt: false,
    customPrompt: "",
  },
]

/* ------------------------------------------------------------------ */
/*  Skill Card                                                        */
/* ------------------------------------------------------------------ */
function SkillCard({
  skill,
  onAddContext,
}: {
  skill: Skill
  onAddContext: () => void
}) {
  const Icon = skill.icon

  return (
    <Card className="flex flex-col justify-between">
      <CardContent className="flex flex-1 flex-col px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-[18px] w-[18px] text-foreground/70" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-foreground">
          {skill.name}
        </h3>
        <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">
          {skill.description}
        </p>

        <div className="mt-5">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 transition-colors hover:underline"
            onClick={onAddContext}
          >
            {skill.hasCustomPrompt ? (
              <>
                <Pencil className="h-3 w-3" />
                Edit your context
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                Add your context
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Refine Dialog                                                     */
/* ------------------------------------------------------------------ */
function RefineDialog({
  skill,
  open,
  onOpenChange,
  onSave,
}: {
  skill: Skill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, prompt: string) => void
}) {
  const [promptText, setPromptText] = useState("")

  function handleOpen() {
    if (skill) {
      setPromptText(skill.customPrompt)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (val) handleOpen()
        onOpenChange(val)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {"Refine: "}{skill?.name}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-relaxed">
            Add business-specific instructions so Fora acts the way your team would.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <Textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={5}
            className="resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40"
            placeholder={`When a customer promises to pay, allow up to 7 days extension.\nIf overdue exceeds 60 days, escalate to collections manager.`}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            This supplements the default behavior of this skill.
          </p>
        </div>

        <DialogFooter className="mt-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!promptText.trim()}
            onClick={() => {
              if (skill) {
                onSave(skill.id, promptText.trim())
                onOpenChange(false)
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
export default function ForaSkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)

  function handleSavePrompt(id: string, prompt: string) {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, hasCustomPrompt: true, customPrompt: prompt }
          : s
      )
    )
    toast.success("Context saved successfully.")
  }

  function openDialog(skill: Skill) {
    setActiveSkill(skill)
    setDialogOpen(true)
  }

  return (
    <div className="p-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-8 max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Fora Skills
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fora is your AI collections co-worker.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          She handles customer conversations and collection workflows using built-in skills.
          You can refine how each skill behaves by adding your business context.
        </p>
      </div>

      {/* ── Skills Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onAddContext={() => openDialog(skill)}
          />
        ))}
      </div>

      {/* ── Extend Fora (Future) ──────────────────────── */}
      <div className="mt-10 rounded-lg border border-border/40 bg-muted/20 px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Extend Fora
            </h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              {"Soon you'll be able to add entirely new skills tailored to your workflows."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="gap-1.5 text-xs"
            >
              Add Your Own Skill
            </Button>
            <span className="text-[11px] text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </div>

      {/* ── Dialog ────────────────────────────────────── */}
      <RefineDialog
        skill={activeSkill}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSavePrompt}
      />
    </div>
  )
}
