"""
The email processing pipeline.
Called by both the Gmail poller and the /inbox/simulate endpoint.
Steps:
1. Match sender email to a customer + invoice
2. Classify intent via Claude
3. Apply schedule adjustment
4. Generate draft reply via Claude
5. Persist everything to DB
"""
import re
from datetime import datetime, date
from sqlalchemy.orm import Session
from models import Customer, Invoice, InboxMessage, Setting, ActionLog
from services.classifier import classify_email
from services.reply_generator import generate_draft_reply
from services import scheduler


def _normalize_subject(subject: str) -> str:
    """Strip Re:, Fwd:, RE:, FWD: prefixes for thread matching."""
    return re.sub(r'^(re|fwd|fw):\s*', '', subject.strip(), flags=re.IGNORECASE).strip()


def _next_ticket_id(db: Session) -> str:
    count = db.query(InboxMessage).count()
    return f"TKT-{count + 1:04d}"


def _get_customer_settings(db: Session, customer_id: int | None) -> dict:
    """Get merged settings for a customer (customer overrides global)."""
    global_settings = db.query(Setting).filter(Setting.scope == "global").all()
    merged = {s.key: s.value for s in global_settings}
    if customer_id:
        customer_settings = (
            db.query(Setting)
            .filter(Setting.scope == "customer", Setting.customer_id == customer_id)
            .all()
        )
        for s in customer_settings:
            merged[s.key] = s.value
    return merged


def process_email(
    db: Session,
    from_email: str,
    subject: str,
    body: str,
    simulated: bool = False,
) -> InboxMessage:
    """
    Full pipeline: receive email → classify → adjust schedule → draft reply → persist.
    Returns the persisted InboxMessage.
    """
    # 1. Match customer
    customer = db.query(Customer).filter(Customer.email == from_email).first()
    invoice = None
    if customer and customer.invoices:
        # Pick the most relevant invoice: overdue/paused first, else first
        for inv in customer.invoices:
            if inv.status in ("overdue", "paused", "disputed"):
                invoice = inv
                break
        if not invoice:
            invoice = customer.invoices[0]

    # 2. Thread matching: same sender + normalized subject
    normalized_subject = _normalize_subject(subject)
    thread_key = f"{from_email}::{normalized_subject}" if from_email else None

    existing_thread = None
    if thread_key:
        existing_thread = (
            db.query(InboxMessage)
            .filter(
                InboxMessage.thread_key == thread_key,
                InboxMessage.status != "closed",
            )
            .first()
        )

    # 3. Classify intent
    classification = {"intent": "unclear", "confidence": 0.0, "promised_date": None, "summary": ""}
    if customer and invoice:
        classification = classify_email(
            body=body,
            customer_name=customer.name,
            invoice_number=invoice.invoice_number,
            invoice_amount=invoice.amount,
            due_date=invoice.due_date,
        )

    intent = classification["intent"]
    confidence = classification["confidence"]
    promised_date_str = classification.get("promised_date")
    promised_date = None
    if promised_date_str:
        try:
            promised_date = date.fromisoformat(promised_date_str)
        except ValueError:
            pass

    # 4. Apply schedule adjustment
    actions_taken = []
    if customer and invoice:
        if intent == "will_pay_later":
            pd = promised_date or (date.today() + __import__('datetime').timedelta(days=7))
            actions_taken = scheduler.apply_will_pay_later(db, invoice, inbox_id=0, promised_date=pd)
        elif intent == "already_paid":
            actions_taken = scheduler.apply_already_paid(db, invoice, inbox_id=0)
        elif intent == "disputed":
            actions_taken = scheduler.apply_disputed(db, invoice, inbox_id=0)
        else:
            actions_taken = scheduler.apply_unclear(db, invoice, inbox_id=0)

    # 5. Get settings for reply generation
    settings = _get_customer_settings(db, customer.id if customer else None)

    # 6. Generate draft reply
    draft_reply = ""
    if customer and invoice:
        draft_reply = generate_draft_reply(
            intent=intent,
            customer_name=customer.name,
            invoice_number=invoice.invoice_number,
            invoice_amount=invoice.amount,
            actions_taken=actions_taken,
            promised_date=promised_date_str,
            settings=settings,
        )

    # 7. Persist inbox message (create or append to thread)
    if existing_thread:
        # Append to existing thread
        existing_thread.body = existing_thread.body + f"\n\n---\n{body}"
        existing_thread.thread_count += 1
        existing_thread.received_at = datetime.utcnow()
        existing_thread.intent = intent
        existing_thread.confidence = confidence
        existing_thread.promised_date = promised_date
        existing_thread.intent_summary = classification.get("summary", "")
        existing_thread.draft_reply = draft_reply
        existing_thread.action_summary = "; ".join(actions_taken)
        existing_thread.status = "classified" if intent != "unclear" else "needs_review"
        db.commit()
        msg = existing_thread
    else:
        ticket_id = _next_ticket_id(db)
        msg = InboxMessage(
            ticket_id=ticket_id,
            customer_id=customer.id if customer else None,
            invoice_id=invoice.id if invoice else None,
            from_email=from_email,
            subject=subject,
            body=body,
            thread_key=thread_key,
            thread_count=1,
            intent=intent,
            confidence=confidence,
            promised_date=promised_date,
            intent_summary=classification.get("summary", ""),
            draft_reply=draft_reply,
            action_summary="; ".join(actions_taken),
            status="classified" if intent != "unclear" else "needs_review",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

    # 8. Backfill inbox_id on action logs that were created with inbox_id=0
    db.query(ActionLog).filter(
        ActionLog.inbox_id == 0,
        ActionLog.invoice_id == (invoice.id if invoice else None),
    ).update({"inbox_id": msg.id})
    db.commit()

    return msg
