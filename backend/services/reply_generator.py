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
Sign off as 'Collections Team'."""


def generate_draft_reply(
    intent: str,
    customer_name: str,
    invoice_number: str,
    invoice_amount: float,
    actions_taken: list[str],
    promised_date: str | None = None,
    settings: dict | None = None,
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
        "unclear": "The customer's message was unclear in terms of payment intent.",
    }.get(intent, "The customer responded to our invoice.")

    user_message = f"""Write a reply email to {customer_name} regarding invoice {invoice_number} (${invoice_amount:,.2f}).

Context: {intent_context}

Actions our system has automatically taken:
{actions_summary}

Sign the email as '{sign_off}' from {company_name}.
Keep the reply to 3-5 sentences. Be professional and human."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
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
