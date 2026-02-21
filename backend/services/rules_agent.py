"""
Claude-powered rules agent.
Passes the PDF directly to Claude as a native document block — no text extraction.
Claude reads layout, tables, and formatting directly and returns the full schedule.
"""
import base64
import json
import os
from datetime import date

from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

RULES_AGENT_SYSTEM = """You are an accounts receivable scheduling agent.
You will receive an AR rules document and a list of invoices.

STEP 1 — EXTRACT RULES
Focus on the summary table (if present) which lists actions with day offsets, audience, and template names.
Ignore the verbose email body text — it is not needed for scheduling.

Extraction rules:
- Use a short, clear name (e.g. "Soft Reminder -7d", "Overdue Notice +8d", "Internal Escalation +29d", "Login Disabled +60d")
- audience must be exactly "Customer" or "Internal" — map any "AM / AR DL" or internal distribution to "Internal"
- type is "email" for customer-facing templates; "escalation" for internal alerts or legal/management actions
- frequency: "Once" for single-fire rules; "Monthly" for rules described as recurring monthly; "Weekly" or "Daily" if stated
- For rules with no fixed day offset (e.g. "monthly until cancelled"): use the nearest logical anchor day (e.g. 90) and frequency "Monthly"
- For conditional rules (e.g. ">$25k ARR legal intervention", "<$25k cancellation"): extract both as separate rules using the stated day_offset — ignore the business condition, schedule for all invoices
- Skip rows that are questions, notes, or blank — only extract actionable rules

STEP 2 — SCHEDULE ACTIONS
For each invoice × each rule, compute scheduled_date = due_date + day_offset.

Color logic:
- "blue"  → day_offset < 0 (pre-due reminder)
- "red"   → day_offset > 0 and audience is Customer (overdue customer notice)
- "grey"  → audience is Internal
- "orange" → Monthly recurring rules

Status logic:
- "sent"    → scheduled_date is strictly before today
- "pending" → scheduled_date is today or in the future

STEP 3 — RETURN JSON
Return ONLY valid JSON — no prose, no markdown fences, no explanation.

{
  "rules": [
    {
      "name": "string",
      "day_offset": integer,
      "audience": "Customer" or "Internal",
      "type": "email" or "escalation",
      "frequency": "Once" or "Monthly" or "Weekly" or "Daily"
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
      "color": "blue" or "red" or "grey" or "orange"
    }
  ]
}"""


def _build_file_block(content: bytes) -> dict:
    """Return a PDF document block — Claude reads the file natively."""
    return {
        "type": "document",
        "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": base64.standard_b64encode(content).decode("utf-8"),
        },
    }


def parse_and_schedule(
    file_content: bytes,
    invoices: list[dict],  # [{"invoice_number": ..., "due_date": ..., "customer_name": ...}]
    today: date,
) -> dict:
    """
    Send the PDF rules document + invoice context to Claude.
    Returns { rules: [...], scheduled_actions: [...] }
    """
    invoice_lines = "\n".join(
        f"  - {inv['invoice_number']} | Customer: {inv['customer_name']} | Due date: {inv['due_date']}"
        for inv in invoices
    )

    instruction = (
        f"Today's date: {today}\n\n"
        f"INVOICES TO SCHEDULE:\n{invoice_lines}\n\n"
        "Parse all rules from the attached document and compute the complete schedule "
        "for every invoice listed above. Apply each rule's day offset to each invoice's "
        f"due date to get the exact scheduled_date. Mark actions as \"sent\" if "
        f"scheduled_date is before today ({today}), otherwise \"pending\". "
        "Return the full JSON."
    )

    file_block = _build_file_block(file_content)

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8192,
        system=RULES_AGENT_SYSTEM,
        messages=[{
            "role": "user",
            "content": [
                file_block,
                {"type": "text", "text": instruction},
            ],
        }],
    )

    raw = response.content[0].text.strip()

    # Write raw response to debug file
    import pathlib
    debug_path = pathlib.Path(__file__).parent.parent.parent / "logs" / "rules_agent_raw.txt"
    debug_path.parent.mkdir(exist_ok=True)
    debug_path.write_text(raw)
    print(f"[rules_agent] Raw response written to {debug_path} ({len(raw)} chars, stop_reason={response.stop_reason})")

    # Strip markdown fences if Claude added them despite instructions
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)
