from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import InboxMessage, Customer, Invoice, ActionLog
from schemas import InboxMessageOut, SimulateMessageIn

router = APIRouter(prefix="/inbox", tags=["inbox"])


def _enrich(msg: InboxMessage) -> InboxMessageOut:
    out = InboxMessageOut.model_validate(msg)
    if msg.customer:
        out.customer_name = msg.customer.name
        out.customer_initials = msg.customer.initials
        out.customer_color = msg.customer.color
    if msg.invoice:
        out.invoice_number = msg.invoice.invoice_number
    return out


@router.get("", response_model=list[InboxMessageOut])
def list_inbox(db: Session = Depends(get_db)):
    messages = (
        db.query(InboxMessage)
        .order_by(InboxMessage.received_at.desc())
        .all()
    )
    return [_enrich(m) for m in messages]


@router.get("/{ticket_id}", response_model=InboxMessageOut)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    msg = db.query(InboxMessage).filter(InboxMessage.ticket_id == ticket_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _enrich(msg)


@router.post("/simulate", response_model=InboxMessageOut)
def simulate_message(payload: SimulateMessageIn, db: Session = Depends(get_db)):
    """
    Trigger the full email processing pipeline with a simulated message.
    Used by the presenter during the demo when live Gmail is not available
    or for controlled demonstrations.
    """
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    from services.pipeline import process_email
    msg = process_email(
        db=db,
        from_email=customer.email,
        subject=payload.subject or "Customer reply",
        body=payload.body,
        simulated=True,
    )
    return _enrich(msg)


class SendReplyIn(BaseModel):
    body: Optional[str] = None  # if None, sends the existing draft_reply


@router.post("/{ticket_id}/send-reply", response_model=InboxMessageOut)
def send_reply(ticket_id: str, payload: SendReplyIn, db: Session = Depends(get_db)):
    """
    Send the draft reply (or a custom body) as a real email via Gmail SMTP.
    This is the demo's lightbulb moment — the reply goes to the actual sender's inbox.
    """
    msg = db.query(InboxMessage).filter(InboxMessage.ticket_id == ticket_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Ticket not found")

    body_to_send = payload.body or msg.draft_reply
    if not body_to_send:
        raise HTTPException(status_code=400, detail="No reply body — generate a draft first")

    from services.gmail_sender import send_reply as smtp_send
    success = smtp_send(
        to_email=msg.from_email,
        subject=msg.subject,
        body=body_to_send,
    )

    if not success:
        raise HTTPException(status_code=503, detail="Gmail SMTP not configured or send failed")

    # Mark thread as closed and log the action
    msg.status = "closed"
    db.add(ActionLog(
        invoice_id=msg.invoice_id,
        inbox_id=msg.id,
        action_type="replied",
        description=f"Reply sent to {msg.from_email} for ticket {ticket_id}",
    ))
    db.commit()
    db.refresh(msg)

    return _enrich(msg)
