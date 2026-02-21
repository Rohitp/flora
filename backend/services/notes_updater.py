"""
Maintains a running agent-notes summary per customer.
Called at the end of each pipeline run to update the customer's Setting(agent_notes).
Uses Claude Haiku — fast and cheap, purely a summarisation task.
"""
import os
from datetime import date
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

SYSTEM = """You maintain a concise agent notes log for an accounts receivable team.
You will receive the existing notes and details of the latest customer interaction.
Return ONLY the updated notes — no commentary, no markdown fences.

Rules:
- Add a new bullet for the latest interaction at the top.
- Each bullet: [YYYY-MM-DD] <what customer said> | Intent: <intent> | Actions: <actions> | Next: <what still needs to happen>
- Keep the total notes under 600 characters. If too long, condense older entries into a single summary line at the bottom.
- End with a CURRENT STATUS line summarising where things stand right now."""


def update_agent_notes(
    existing_notes: str,
    customer_name: str,
    invoice_number: str,
    email_summary: str,      # one-sentence summary of what the customer said
    intent: str,
    actions_taken: list[str],
    promised_date: str | None,
    today: date,
) -> str:
    """Return updated agent notes string. Falls back to a simple append on error."""
    actions_str = "; ".join(actions_taken) if actions_taken else "none"
    next_step = _infer_next_step(intent, promised_date)

    user_message = (
        f"Customer: {customer_name}  |  Invoice: {invoice_number}\n\n"
        f"EXISTING NOTES:\n{existing_notes or '(none yet)'}\n\n"
        f"LATEST INTERACTION ({today}):\n"
        f"  What customer said: {email_summary}\n"
        f"  Intent: {intent}\n"
        f"  Actions taken: {actions_str}\n"
        f"  Promised date: {promised_date or 'n/a'}\n"
        f"  Suggested next step: {next_step}\n\n"
        "Update the notes."
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            system=SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[notes_updater] Error: {e}")
        # Graceful fallback — just prepend a line
        new_line = f"[{today}] {email_summary} | Intent: {intent} | Actions: {actions_str}"
        return f"{new_line}\n{existing_notes or ''}".strip()


def _infer_next_step(intent: str, promised_date: str | None) -> str:
    if intent == "will_pay_later":
        return f"Follow up after promised date ({promised_date})" if promised_date else "Follow up on promised payment"
    if intent == "already_paid":
        return "Verify payment receipt and close invoice"
    if intent == "disputed":
        return "Escalate to account manager for dispute resolution"
    return "Monitor and send next scheduled reminder"
