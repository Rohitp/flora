"""
Claude-powered rules agent.
Takes raw file content + invoice context.
Returns parsed rules + complete scheduled actions for all invoices.
No column-matching, no day_offset arithmetic — Claude does all interpretation.
"""
import json
import os
from datetime import date
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

RULES_AGENT_SYSTEM = """You are an accounts receivable scheduling agent.
You will receive a rules document and a list of invoices.
Your job is to:
1. Parse the rules from the document — understand the intent of each rule regardless of format
2. For each invoice, compute the exact calendar date for every rule action by applying the day offset to the invoice due date
3. Return ONLY valid JSON — no prose, no markdown fences, no explanation

A rule has:
- name: descriptive label
- day_offset: integer days relative to due date (negative = before due date, positive = after)
- audience: "Customer" or "Internal"
- type: "email" or "escalation"
- frequency: "Once", "Daily", or "Weekly"

A scheduled action has:
- invoice_number: the invoice this action belongs to
- action_name: the rule name
- scheduled_date: YYYY-MM-DD (due_date + day_offset)
- audience: "Customer" or "Internal"
- day_offset: integer
- status: "sent" if scheduled_date is before today, "pending" if today or future
- color: "blue" if day_offset < 0 (pre-due reminders), "red" if day_offset > 0 and audience is Customer (overdue notices), "grey" if audience is Internal, "green" if status is completed

Return this exact JSON structure:
{
  "rules": [
    {
      "name": "string",
      "day_offset": integer,
      "audience": "Customer" or "Internal",
      "type": "email" or "escalation",
      "frequency": "Once" or "Daily" or "Weekly"
    }
  ],
  "scheduled_actions": [
    {
      "invoice_number": "string",
      "action_name": "string",
      "scheduled_date": "YYYY-MM-DD",
      "audience": "Customer" or "Internal",
      "day_offset": integer,
      "status": "sent" or "pending",
      "color": "blue" or "red" or "grey" or "green" or "orange"
    }
  ]
}"""


def parse_and_schedule(
    file_text: str,
    invoices: list[dict],  # [{"invoice_number": ..., "due_date": ..., "customer_name": ...}]
    today: date,
) -> dict:
    """
    Send rules file text + invoice context to Claude.
    Returns { rules: [...], scheduled_actions: [...] }
    """
    invoice_lines = "\n".join(
        f"  - {inv['invoice_number']} | Customer: {inv['customer_name']} | Due date: {inv['due_date']}"
        for inv in invoices
    )

    user_message = f"""Today's date: {today}

INVOICES TO SCHEDULE:
{invoice_lines}

RULES DOCUMENT:
---
{file_text}
---

Parse all rules from the document and compute the complete schedule for every invoice listed above.
Apply each rule's day offset to each invoice's due date to get the exact scheduled_date.
Mark actions as "sent" if scheduled_date is before today ({today}), otherwise "pending".
Return the full JSON."""

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=RULES_AGENT_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()

    # Strip markdown fences if Claude added them despite instructions
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)
