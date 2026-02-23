"use client"

import { use, useEffect, useState } from "react"
import { notFound } from "next/navigation"
import { AutomationForm } from "@/components/automations/automation-form"
import type { Condition, ReminderStep } from "@/components/automations/automation-form"
import {
  sampleAutomations,
  defaultAutomation,
  type Automation,
} from "@/lib/automations-data"
import { api, type Rule } from "@/lib/api"
import { getTemplateForRule } from "@/lib/rule-templates"

/* ------------------------------------------------------------------ */
/*  Map stored automation data into the form's Condition / Step types */
/* ------------------------------------------------------------------ */

const fieldLabelToKey: Record<string, string> = {
  Country: "country",
  "Invoice Amount": "invoice_amount",
  "Payment Method": "payment_method",
  "Risk Category": "risk_category",
  Plan: "plan",
  Region: "region",
  "Customer Type": "customer_type",
  Currency: "currency",
}

function toConditions(automation: Automation): Condition[] {
  return automation.segmentFilters.map((f, idx) => ({
    id: `ec-${idx}`,
    field: fieldLabelToKey[f.field] ?? f.field.toLowerCase().replace(/\s+/g, "_"),
    operator: f.operator,
    value: f.value,
  }))
}

function toSteps(automation: Automation): ReminderStep[] {
  return automation.emailSteps.map((step, idx) => ({
    id: `es-${idx}`,
    dayOffset: step.dayOffset,
    channel: "email" as const,
    templateName: step.label,
    subject: `Invoice #{{invoice_id}} — ${step.label}`,
    body: `Dear {{customer_name}},\n\nThis is regarding invoice #{{invoice_id}} for {{invoice_amount}}.\n\n${step.label} — please take appropriate action.\n\nBest regards,\n{{company_name}}`,
  }))
}

function ruleToStep(rule: Rule, idx: number): ReminderStep {
  const tmpl = getTemplateForRule(rule.day_offset, rule.audience)
  return {
    id: `rule-${rule.id}-${idx}`,
    dayOffset: rule.day_offset,
    channel: "email" as const,
    templateName: tmpl.templateName,
    subject: tmpl.subject,
    body: tmpl.body,
  }
}

const allStaticAutomations = [...sampleAutomations, defaultAutomation]

/* ------------------------------------------------------------------ */
/*  Default Automation — loaded from backend                          */
/* ------------------------------------------------------------------ */

function DefaultAutomationEditPage() {
  const [steps, setSteps] = useState<ReminderStep[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.rules.list()
      .then((rules) => {
        if (rules.length === 0) {
          // No rules yet — start with empty form
          setSteps([])
        } else {
          setSteps(rules.map(ruleToStep))
        }
      })
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Could not load rules. Make sure the backend is running.
        </p>
      </div>
    )
  }

  if (steps === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <AutomationForm
      mode="edit"
      automationName="Default Automation"
      initialConditions={[]}
      initialGroupOperator="AND"
      initialSteps={steps}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  // Default automation is always wired to the backend
  if (id === "default") {
    return <DefaultAutomationEditPage />
  }

  // Sample automations use static data
  const automation = allStaticAutomations.find((a) => a.id === id)
  if (!automation) notFound()

  return (
    <AutomationForm
      mode="edit"
      automationName={automation.name}
      initialConditions={toConditions(automation)}
      initialGroupOperator="AND"
      initialSteps={toSteps(automation)}
    />
  )
}
