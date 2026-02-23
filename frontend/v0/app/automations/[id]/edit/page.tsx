"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { AutomationForm } from "@/components/automations/automation-form"
import type { Condition, ReminderStep } from "@/components/automations/automation-form"
import {
  sampleAutomations,
  defaultAutomation,
  type Automation,
} from "@/lib/automations-data"

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

const allAutomations = [...sampleAutomations, defaultAutomation]

function findAutomation(id: string): Automation | undefined {
  return allAutomations.find((a) => a.id === id)
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
  const automation = findAutomation(id)

  if (!automation) {
    notFound()
  }

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
