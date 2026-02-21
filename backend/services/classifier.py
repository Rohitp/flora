"""
Claude-based intent classification.
Call 1 of 2: classify the customer's email into a structured intent.
"""
import json
import os
from datetime import date
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

CLASSIFICATION_SYSTEM = """You are an accounts receivable classification agent.
Your job is to read a customer's email and classify their intent.
You must return ONLY valid JSON — no prose, no markdown, no explanation.

Valid intents:
- will_pay_later: Customer acknowledges they owe money and will pay, possibly with a date
- already_paid: Customer claims they have already paid
- disputed: Customer disputes the invoice amount, contents, or validity
- unclear: The message does not clearly express any of the above

If agent notes are provided, use them as context about this customer's history — prior
promises, disputes, or patterns — to inform a more accurate classification.

Return this exact JSON structure:
{
  "intent": "<one of the four values above>",
  "confidence": <float 0.0 to 1.0>,
  "promised_date": "<YYYY-MM-DD or null>",
  "summary": "<one sentence plain English description of what the customer said>"
}"""


def classify_email(
    body: str,
    customer_name: str,
    invoice_number: str,
    invoice_amount: float,
    due_date: date,
    agent_notes: str = "",
) -> dict:
    """
    Classify a customer email. Returns a dict with:
    intent, confidence, promised_date (str or None), summary
    """
    notes_section = f"\nAgent notes on this customer:\n{agent_notes}\n" if agent_notes else ""

    user_message = f"""Customer: {customer_name}
Invoice: {invoice_number}
Amount: ${invoice_amount:,.2f}
Due date: {due_date}{notes_section}

Customer's email:
---
{body}
---

Classify the intent of this email."""

    try:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=256,
            system=CLASSIFICATION_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = response.content[0].text.strip()
        # Strip markdown fences if Claude added them despite instructions
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = json.loads(raw)
        # Ensure all expected keys exist
        return {
            "intent": result.get("intent", "unclear"),
            "confidence": float(result.get("confidence", 0.5)),
            "promised_date": result.get("promised_date"),
            "summary": result.get("summary", ""),
        }
    except Exception as e:
        print(f"[classifier] Error: {e}")
        return {
            "intent": "unclear",
            "confidence": 0.0,
            "promised_date": None,
            "summary": f"Classification failed: {e}",
        }
