"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  ChevronRight,
  Plus,
  Trash2,
  Mail,
  Pencil,
  Eye,
  Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDayOffset, formatDayOffsetShort } from "@/lib/automations-data"

/* ================================================================== */
/*  TYPES                                                             */
/* ================================================================== */

export interface Condition {
  id: string
  field: string
  operator: string
  value: string
}

export interface ReminderStep {
  id: string
  dayOffset: number
  channel: "email"
  templateName: string
  subject: string
  body: string
}

export interface AutomationFormProps {
  mode: "create" | "edit"
  automationName?: string
  initialConditions?: Condition[]
  initialGroupOperator?: "AND" | "OR"
  initialSteps?: ReminderStep[]
}

/* ================================================================== */
/*  FIELD / OPERATOR CONFIG                                           */
/* ================================================================== */

const fieldOptions = [
  { value: "country", label: "Country" },
  { value: "invoice_amount", label: "Invoice Amount" },
  { value: "payment_method", label: "Payment Method" },
  { value: "risk_category", label: "Risk Category" },
  { value: "plan", label: "Plan" },
  { value: "region", label: "Region" },
  { value: "customer_type", label: "Customer Type" },
  { value: "currency", label: "Currency" },
]

const operatorsByField: Record<string, { value: string; label: string }[]> = {
  country: [
    { value: "=", label: "is" },
    { value: "!=", label: "is not" },
    { value: "in", label: "in" },
  ],
  invoice_amount: [
    { value: ">", label: "greater than" },
    { value: "<", label: "less than" },
    { value: "=", label: "equals" },
    { value: ">=", label: "at least" },
    { value: "<=", label: "at most" },
  ],
  payment_method: [
    { value: "=", label: "is" },
    { value: "!=", label: "is not" },
  ],
  risk_category: [
    { value: "=", label: "is" },
    { value: "!=", label: "is not" },
  ],
  plan: [
    { value: "=", label: "is" },
    { value: "!=", label: "is not" },
    { value: "contains", label: "contains" },
  ],
  region: [
    { value: "=", label: "is" },
    { value: "!=", label: "is not" },
  ],
  customer_type: [
    { value: "=", label: "is" },
    { value: "!=", label: "is not" },
  ],
  currency: [
    { value: "=", label: "is" },
    { value: "!=", label: "is not" },
  ],
}

const defaultOperators = [
  { value: "=", label: "is" },
  { value: "!=", label: "is not" },
  { value: "contains", label: "contains" },
]

const dayOffsetOptions = [
  { value: -30, label: "30 days before (DD-30)" },
  { value: -15, label: "15 days before (DD-15)" },
  { value: -7, label: "7 days before (DD-7)" },
  { value: -3, label: "3 days before (DD-3)" },
  { value: -1, label: "1 day before (DD-1)" },
  { value: 0, label: "On due date (DD)" },
  { value: 1, label: "1 day after (DD+1)" },
  { value: 3, label: "3 days after (DD+3)" },
  { value: 5, label: "5 days after (DD+5)" },
  { value: 7, label: "7 days after (DD+7)" },
  { value: 14, label: "14 days after (DD+14)" },
  { value: 21, label: "21 days after (DD+21)" },
  { value: 30, label: "30 days after (DD+30)" },
  { value: 45, label: "45 days after (DD+45)" },
  { value: 60, label: "60 days after (DD+60)" },
  { value: 90, label: "90 days after (DD+90)" },
]

/* ================================================================== */
/*  HELPERS                                                           */
/* ================================================================== */

let _condId = 100
function newCondition(): Condition {
  return { id: `cond-${++_condId}`, field: "", operator: "", value: "" }
}

let _stepId = 100
function newReminderStep(dayOffset: number = 0): ReminderStep {
  return {
    id: `step-${++_stepId}`,
    dayOffset,
    channel: "email",
    templateName: "Untitled Template",
    subject: "",
    body: "",
  }
}

/* ================================================================== */
/*  CONDITION ROW                                                     */
/* ================================================================== */

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
  groupOperator,
}: {
  condition: Condition
  index: number
  onChange: (id: string, updates: Partial<Condition>) => void
  onRemove: (id: string) => void
  groupOperator: "AND" | "OR"
}) {
  const operators = condition.field
    ? operatorsByField[condition.field] || defaultOperators
    : defaultOperators

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-9 w-12 shrink-0 items-center justify-center">
        {index === 0 ? (
          <span className="text-[11px] font-medium uppercase text-muted-foreground">Where</span>
        ) : (
          <span className="text-[11px] font-semibold uppercase text-primary">{groupOperator}</span>
        )}
      </div>

      <Select
        value={condition.field}
        onValueChange={(val) => onChange(condition.id, { field: val, operator: "", value: "" })}
      >
        <SelectTrigger className="h-9 w-40 text-xs">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {fieldOptions.map((f) => (
            <SelectItem key={f.value} value={f.value} className="text-xs">
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(val) => onChange(condition.id, { operator: val })}
        disabled={!condition.field}
      >
        <SelectTrigger className="h-9 w-32 text-xs">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="h-9 flex-1 text-xs"
        placeholder="Value"
        value={condition.value}
        onChange={(e) => onChange(condition.id, { value: e.target.value })}
        disabled={!condition.operator}
      />

      <button
        onClick={() => onRemove(condition.id)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        aria-label="Remove condition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ================================================================== */
/*  CUSTOMER SEGMENT SECTION                                          */
/* ================================================================== */

function CustomerSegmentSection({
  conditions,
  groupOperator,
  onGroupOperatorChange,
  onConditionChange,
  onAddCondition,
  onRemoveCondition,
}: {
  conditions: Condition[]
  groupOperator: "AND" | "OR"
  onGroupOperatorChange: (op: "AND" | "OR") => void
  onConditionChange: (id: string, updates: Partial<Condition>) => void
  onAddCondition: () => void
  onRemoveCondition: (id: string) => void
}) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Customer Segment</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define which customers this automation applies to.
            </p>
          </div>
          {conditions.length > 1 && (
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <button
                onClick={() => onGroupOperatorChange("AND")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  groupOperator === "AND"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                AND
              </button>
              <button
                onClick={() => onGroupOperatorChange("OR")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  groupOperator === "OR"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                OR
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          {conditions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
              <p className="text-xs text-muted-foreground">
                This automation applies to all customers.
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                Add conditions to target specific customer segments.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {conditions.map((cond, idx) => (
                <ConditionRow
                  key={cond.id}
                  condition={cond}
                  index={idx}
                  groupOperator={groupOperator}
                  onChange={onConditionChange}
                  onRemove={onRemoveCondition}
                />
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5 text-xs"
            onClick={onAddCondition}
          >
            <Plus className="h-3 w-3" />
            Add Condition
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================================== */
/*  REMINDER TIMELINE SECTION                                         */
/* ================================================================== */

function ReminderTimelineSection({
  steps,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onEditTemplate,
}: {
  steps: ReminderStep[]
  onUpdateStep: (id: string, updates: Partial<ReminderStep>) => void
  onAddStep: () => void
  onRemoveStep: (id: string) => void
  onEditTemplate: (id: string) => void
}) {
  const sorted = [...steps].sort((a, b) => a.dayOffset - b.dayOffset)

  return (
    <Card>
      <CardContent className="px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Reminder Schedule</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Configure when reminder emails are sent relative to invoice due date.
        </p>

        <div className="mt-5">
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
              <p className="text-xs text-muted-foreground">
                No reminders configured yet.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

              <div className="flex flex-col gap-0">
                {sorted.map((step) => (
                  <div key={step.id} className="group relative flex items-stretch gap-0">
                    <div className="relative z-10 flex w-10 shrink-0 flex-col items-center pt-4">
                      <div
                        className={cn(
                          "flex h-[10px] w-[10px] items-center justify-center rounded-full border-2",
                          step.dayOffset < 0
                            ? "border-primary bg-primary/10"
                            : step.dayOffset === 0
                              ? "border-[#f59e0b] bg-[#f59e0b]/10"
                              : "border-destructive bg-destructive/10"
                        )}
                      />
                    </div>

                    <div className="flex-1 pb-3">
                      <div className="rounded-lg border border-border bg-card px-4 py-3 transition-colors group-hover:border-border/80 group-hover:shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none",
                                  step.dayOffset < 0
                                    ? "bg-primary/10 text-primary"
                                    : step.dayOffset === 0
                                      ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                                      : "bg-destructive/10 text-destructive"
                                )}
                              >
                                {formatDayOffsetShort(step.dayOffset)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatDayOffset(step.dayOffset)}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>Email</span>
                              </div>
                              <span className="text-border">|</span>
                              <span className="truncate text-xs font-medium text-foreground">
                                {step.templateName}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1 pt-0.5">
                            <Select
                              value={String(step.dayOffset)}
                              onValueChange={(val) =>
                                onUpdateStep(step.id, { dayOffset: Number(val) })
                              }
                            >
                              <SelectTrigger className="h-7 w-[140px] text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {dayOffsetOptions.map((o) => (
                                  <SelectItem
                                    key={o.value}
                                    value={String(o.value)}
                                    className="text-[11px]"
                                  >
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <button
                              onClick={() => onEditTemplate(step.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              aria-label="Edit template"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>

                            <button
                              onClick={() => onRemoveStep(step.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                              aria-label="Remove reminder"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5 text-xs"
            onClick={onAddStep}
          >
            <Plus className="h-3 w-3" />
            Add Reminder
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================================== */
/*  EMAIL TEMPLATE DRAWER                                             */
/* ================================================================== */

function EmailTemplateDrawer({
  open,
  step,
  onClose,
  onSave,
}: {
  open: boolean
  step: ReminderStep | null
  onClose: () => void
  onSave: (id: string, updates: Partial<ReminderStep>) => void
}) {
  const [localSubject, setLocalSubject] = useState("")
  const [localBody, setLocalBody] = useState("")
  const [localName, setLocalName] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const [lastStepId, setLastStepId] = useState<string | null>(null)
  if (step && step.id !== lastStepId) {
    setLocalSubject(step.subject)
    setLocalBody(step.body)
    setLocalName(step.templateName)
    setLastStepId(step.id)
    setShowPreview(false)
  }

  function handleSave() {
    if (!step) return
    onSave(step.id, {
      subject: localSubject,
      body: localBody,
      templateName: localName,
    })
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(val) => { if (!val) onClose() }}>
      <SheetContent side="right" className="w-[520px] overflow-y-auto p-0 sm:max-w-[520px]">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-sm">Edit Email Template</SheetTitle>
            <SheetDescription className="text-xs">
              {step
                ? `${formatDayOffsetShort(step.dayOffset)} \u2014 ${formatDayOffset(step.dayOffset)}`
                : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-5 py-4">
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Template Name
              </label>
              <Input
                className="h-9 text-xs"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="e.g., Courtesy Reminder"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Subject Line
              </label>
              <Input
                className="h-9 text-xs"
                value={localSubject}
                onChange={(e) => setLocalSubject(e.target.value)}
                placeholder="e.g., Invoice #{{invoice_id}} — Payment Reminder"
              />
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {"Use {{variable}} syntax for dynamic fields."}
              </p>
            </div>

            <div className="mb-3 flex w-fit items-center gap-1 rounded-md border border-border p-0.5">
              <button
                onClick={() => setShowPreview(false)}
                className={cn(
                  "rounded px-3 py-1 text-[11px] font-medium transition-colors",
                  !showPreview
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Edit
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={cn(
                  "flex items-center gap-1 rounded px-3 py-1 text-[11px] font-medium transition-colors",
                  showPreview
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>

            {showPreview ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Preview
                </p>
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="mb-3 text-xs font-semibold text-foreground">
                    {localSubject || "(No subject)"}
                  </p>
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {localBody || "(No content)"}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Email Body
                </label>
                <Textarea
                  className="min-h-[240px] text-xs leading-relaxed"
                  value={localBody}
                  onChange={(e) => setLocalBody(e.target.value)}
                  placeholder={`Dear {{customer_name}},\n\nThis is a friendly reminder that invoice #{{invoice_id}} for {{invoice_amount}} is due on {{due_date}}.\n\nPlease ensure payment is processed on time to avoid any disruption.\n\nBest regards,\n{{company_name}}`}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    "customer_name",
                    "invoice_id",
                    "invoice_amount",
                    "due_date",
                    "company_name",
                    "payment_link",
                  ].map((v) => (
                    <button
                      key={v}
                      onClick={() => setLocalBody((prev) => prev + `{{${v}}}`)}
                      className="rounded border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border px-5 py-3">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave}>
                <Save className="h-3 w-3" />
                Save Template
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ================================================================== */
/*  MAIN FORM COMPONENT                                               */
/* ================================================================== */

const defaultCreateSteps: ReminderStep[] = [
  {
    id: "s1",
    dayOffset: -15,
    channel: "email",
    templateName: "Courtesy Reminder",
    subject: "Invoice #{{invoice_id}} — Payment Due Soon",
    body: "Dear {{customer_name}},\n\nThis is a friendly reminder that invoice #{{invoice_id}} for {{invoice_amount}} is due on {{due_date}}.\n\nPlease ensure payment is processed on time.\n\nBest regards,\n{{company_name}}",
  },
  {
    id: "s2",
    dayOffset: 0,
    channel: "email",
    templateName: "Due Date Reminder",
    subject: "Invoice #{{invoice_id}} — Payment Due Today",
    body: "Dear {{customer_name}},\n\nInvoice #{{invoice_id}} for {{invoice_amount}} is due today.\n\nPlease process payment at your earliest convenience.\n\nBest regards,\n{{company_name}}",
  },
  {
    id: "s3",
    dayOffset: 7,
    channel: "email",
    templateName: "First Follow-Up",
    subject: "Invoice #{{invoice_id}} — Payment Overdue",
    body: "Dear {{customer_name}},\n\nInvoice #{{invoice_id}} for {{invoice_amount}} was due on {{due_date}} and remains unpaid.\n\nPlease arrange payment as soon as possible to avoid further action.\n\nBest regards,\n{{company_name}}",
  },
]

export function AutomationForm({
  mode,
  automationName,
  initialConditions,
  initialGroupOperator,
  initialSteps,
}: AutomationFormProps) {
  const router = useRouter()

  const isEdit = mode === "edit"

  // Segment state
  const [conditions, setConditions] = useState<Condition[]>(initialConditions ?? [])
  const [groupOperator, setGroupOperator] = useState<"AND" | "OR">(initialGroupOperator ?? "AND")

  // Timeline state
  const [steps, setSteps] = useState<ReminderStep[]>(initialSteps ?? defaultCreateSteps)

  // Template drawer
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const editingStep = editingStepId ? steps.find((s) => s.id === editingStepId) ?? null : null

  /* -- Condition handlers -- */
  const handleAddCondition = useCallback(() => {
    setConditions((prev) => [...prev, newCondition()])
  }, [])

  const handleRemoveCondition = useCallback((id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const handleConditionChange = useCallback((id: string, updates: Partial<Condition>) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }, [])

  /* -- Step handlers -- */
  const handleAddStep = useCallback(() => {
    const maxOffset = steps.length > 0 ? Math.max(...steps.map((s) => s.dayOffset)) : -1
    const nextOffset = dayOffsetOptions.find((o) => o.value > maxOffset)?.value ?? maxOffset + 7
    setSteps((prev) => [...prev, newReminderStep(nextOffset)])
  }, [steps])

  const handleRemoveStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const handleUpdateStep = useCallback((id: string, updates: Partial<ReminderStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Link href="/receivables" className="transition-colors hover:text-foreground">
            Receivables
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/receivables/automations" className="transition-colors hover:text-foreground">
            Invoice Reminders
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">
            {isEdit ? `Edit: ${automationName}` : "Create Automation"}
          </span>
        </nav>
      </div>

      {/* Page header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {isEdit ? `Edit "${automationName}"` : "New Invoice Reminder Automation"}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEdit
                ? "Modify customer segments and reminder schedules for this automation."
                : "Define customer segments and configure reminder schedules."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => router.push("/receivables/automations")}
            >
              Cancel
            </Button>
            <Button size="sm" className="gap-1.5 text-xs">
              <Save className="h-3 w-3" />
              {isEdit ? "Save Changes" : "Save Automation"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-background px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <CustomerSegmentSection
            conditions={conditions}
            groupOperator={groupOperator}
            onGroupOperatorChange={setGroupOperator}
            onConditionChange={handleConditionChange}
            onAddCondition={handleAddCondition}
            onRemoveCondition={handleRemoveCondition}
          />

          <ReminderTimelineSection
            steps={steps}
            onUpdateStep={handleUpdateStep}
            onAddStep={handleAddStep}
            onRemoveStep={handleRemoveStep}
            onEditTemplate={setEditingStepId}
          />
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 border-t border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {conditions.length === 0 ? "Applies to all customers" : `${conditions.length} condition${conditions.length !== 1 ? "s" : ""}`}
            {" \u00B7 "}
            {steps.length} reminder{steps.length !== 1 ? "s" : ""} configured
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => router.push("/receivables/automations")}
            >
              Cancel
            </Button>
            <Button size="sm" className="gap-1.5 text-xs">
              {isEdit ? "Save Changes" : "Save Automation"}
            </Button>
          </div>
        </div>
      </div>

      {/* Email template drawer */}
      <EmailTemplateDrawer
        open={!!editingStepId}
        step={editingStep}
        onClose={() => setEditingStepId(null)}
        onSave={handleUpdateStep}
      />
    </div>
  )
}
