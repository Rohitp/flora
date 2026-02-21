"""
The email processing pipeline.
Called by both the Gmail poller and the /inbox/simulate endpoint.
Steps:
1. Match sender email to a customer + invoice
2. Read existing agent notes for this customer
3. Classify intent via Claude (with agent notes context)
4. Apply schedule adjustment
5. Generate draft reply via Claude (with agent notes context)
6. Persist everything to DB
7. Update agent notes with this interaction
"""
import re
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from models import Customer, Invoice, InboxMessage, Setting, ActionLog
from services.classifier import classify_email
from services.reply_generator import generate_draft_reply
from services.notes_updater import update_agent_notes
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


def _upsert_agent_notes(db: Session, customer_id: int, notes: str) -> None:
    """Write updated agent notes back to the settings table."""
    setting = (
        db.query(Setting)
        .filter(
            Setting.scope == "customer",
            Setting.customer_id == customer_id,
            Setting.key == "agent_notes",
        )
        .first()
    )
    if setting:
        setting.value = notes
        setting.updated_at = datetime.utcnow()
    else:
        db.add(Setting(
            scope="customer",
            customer_id=customer_id,
            key="agent_notes",
            value=notes,
        ))
    db.commit()


def process_email(
    db: Session,
    from_email: str,
    subject: str,
    body: str,
    simulated: bool = False,
) -> InboxMessage:
    """
    Full pipeline: receive email → classify → adjust schedule → draft reply → persist → update notes.
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
            .filter(InboxMessage.thread_key == thread_key)
            .order_by(InboxMessage.received_at.desc())
            .first()
        )

    # 3. Read existing agent notes (used as context for classification + reply)
    settings = _get_customer_settings(db, customer.id if customer else None)
    agent_notes = settings.get("agent_notes", "")

    # 4. Classify intent (with agent notes context)
    classification = {"intent": "unclear", "confidence": 0.0, "promised_date": None, "summary": ""}
    if customer and invoice:
        classification = classify_email(
            body=body,
            customer_name=customer.name,
            invoice_number=invoice.invoice_number,
            invoice_amount=invoice.amount,
            due_date=invoice.due_date,
            agent_notes=agent_notes,
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

    # 5. Apply schedule adjustment
    actions_taken = []
    if customer and invoice:
        if intent == "will_pay_later":
            pd = promised_date or (date.today() + timedelta(days=7))
            actions_taken = scheduler.apply_will_pay_later(db, invoice, inbox_id=0, promised_date=pd)
        elif intent == "already_paid":
            actions_taken = scheduler.apply_already_paid(db, invoice, inbox_id=0)
        elif intent == "disputed":
            actions_taken = scheduler.apply_disputed(db, invoice, inbox_id=0)
        else:
            actions_taken = scheduler.apply_unclear(db, invoice, inbox_id=0)

    # 6. Generate draft reply (with agent notes context)
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
            agent_notes=agent_notes,
        )

    # 7. Persist inbox message (create or append to thread)
    if existing_thread:
        # Append to existing thread (reopen if customer replied to a closed thread)
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
        existing_thread.subject = subject  # update to latest subject (e.g. Re: ...)
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

    # 9. Update agent notes with this interaction (async-safe: errors don't break the pipeline)
    if customer and invoice:
        try:
            updated_notes = update_agent_notes(
                existing_notes=agent_notes,
                customer_name=customer.name,
                invoice_number=invoice.invoice_number,
                email_summary=classification.get("summary", body[:120]),
                intent=intent,
                actions_taken=actions_taken,
                promised_date=promised_date_str,
                today=date.today(),
            )
            _upsert_agent_notes(db, customer.id, updated_notes)
            print(f"[pipeline] Agent notes updated for customer {customer.id}")
        except Exception as e:
            print(f"[pipeline] Failed to update agent notes: {e}")

    return msg
