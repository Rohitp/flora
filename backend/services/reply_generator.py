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

You will be given the customer's actual message and any prior conversation history. Read them carefully.
- If the customer asks a specific question (e.g. currency, balance, due date, payment status), answer it
  directly and precisely using the invoice details. Never give a vague or evasive answer.
- If the conversation has prior history, acknowledge it naturally — do not ignore previous context.
- If agent notes are provided, use them to personalise the reply — reference prior commitments or
  patterns where relevant, without being accusatory.
- If business rules or reply style rules are provided, they OVERRIDE all defaults — follow them exactly."""


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
    customer_message: str = "",
    thread_history: str = "",
    skill_context: str = "",
    skill_reply: str = "",
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
    thread_section = f"\nPrior conversation history:\n---\n{thread_history}\n---\n" if thread_history else ""
    message_section = f"\nCustomer's latest message:\n---\n{customer_message}\n---\n" if customer_message else ""
    skill_section = f"\nBusiness rules for this situation (follow strictly):\n{skill_context}\n" if skill_context else ""
    reply_style_section = f"\nReply style & tone rules (always apply):\n{skill_reply}\n" if skill_reply else ""

    # Expose relevant account settings so Claude can answer policy/terms questions
    SETTINGS_TO_EXPOSE = {
        "company_currency", "payment_terms_days", "late_fee_percent",
        "accepted_payment_methods", "bank_details", "escalation_threshold_days",
        "contact_language", "company_name",
    }
    exposed = {k: v for k, v in (settings or {}).items() if k in SETTINGS_TO_EXPOSE}
    account_settings_str = "\n".join(f"  {k}: {v}" for k, v in exposed.items()) if exposed else "  (none configured)"

    user_message = f"""Write a reply email to {customer_name}.

Invoice details:
  Invoice number: {invoice_number}
  Amount outstanding: ${invoice_amount:,.2f}
  Due date: {due_date or 'unknown'}
  Status: {overdue_str}

Account settings (use these to answer questions about payment terms, currency, escalation, etc.):
{account_settings_str}
{thread_section}{message_section}
Situation: {intent_context}{notes_section}

Actions our system has automatically taken:
{actions_summary}

Default sign-off: '{sign_off}' from {company_name}.
Keep the reply to 3-5 sentences. Be specific, professional, and human.
If the customer asked a direct question, answer it first before anything else.
If you don't have enough information to answer a specific question, say so honestly rather than deflecting.
{skill_section}{reply_style_section}"""

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
