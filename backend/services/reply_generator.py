"""
Claude-based draft reply generation.
Call 2 of 2: generate a professional draft reply after classification.
"""
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

REPLY_SYSTEM = """You are a professional accounts receivable collections agent writing on behalf of your company.
Write a concise, professional, and empathetic email reply to a customer.
Tone: firm but courteous. Never threatening. Always leave the door open for resolution.
Do NOT include a subject line. Do NOT include placeholders like [Name].

If agent notes are provided, use them to personalise the reply — reference prior context where
relevant (e.g. acknowledging a previous promise, noting a recurring pattern) without being accusatory.

If the customer appears to be asking a question (about their balance, due date, or payment status),
ALWAYS answer it directly using the invoice details provided. Never give a vague non-answer.

Sign off as 'Collections Team'."""


def generate_draft_reply(
    intent: str,
    customer_name: str,
    invoice_number: str,
    invoice_amount: float,
    actions_taken: list[str],
    promised_date: str | None = None,
    settings: dict | None = None,
    agent_notes: str = "",
    due_date: str = "",
    days_overdue: int | None = None,
) -> str:
    """
    Generate a draft email reply body. Returns plain text string.
    """
    sign_off = (settings or {}).get("reply_sign_off", "Collections Team")
    company_name = (settings or {}).get("company_name", "Receivables Co")

    actions_summary = "\n".join(f"- {a}" for a in actions_taken) if actions_taken else "- Noted in our system"

    intent_context = {
        "will_pay_later": f"The customer has committed to paying by {promised_date or 'a future date'}.",
        "already_paid": "The customer claims they have already made the payment.",
        "disputed": "The customer is disputing this invoice.",
        "unclear": (
            "The customer's message is unclear or appears to be a question — possibly about their "
            "balance, due date, or payment status. Answer their likely question directly using the "
            "invoice details below, and gently remind them of their outstanding balance."
        ),
    }.get(intent, "The customer responded to our invoice.")

    overdue_str = f"{days_overdue} days overdue" if days_overdue and days_overdue > 0 else "not yet overdue"
    notes_section = f"\nAgent notes (prior interactions with this customer):\n{agent_notes}\n" if agent_notes else ""

    user_message = f"""Write a reply email to {customer_name}.

Invoice details:
  Invoice number: {invoice_number}
  Amount outstanding: ${invoice_amount:,.2f}
  Due date: {due_date or 'unknown'}
  Status: {overdue_str}

Situation: {intent_context}{notes_section}

Actions our system has automatically taken:
{actions_summary}

Sign the email as '{sign_off}' from {company_name}.
Keep the reply to 3-5 sentences. Be specific, professional, and human."""

    try:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            system=REPLY_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[reply_generator] Error: {e}")
        return (
            f"Dear {customer_name},\n\n"
            f"Thank you for your message regarding invoice {invoice_number}. "
            "We have noted your response and will follow up shortly.\n\n"
            f"Best regards,\n{sign_off}"
        )
