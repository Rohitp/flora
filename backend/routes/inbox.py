from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import InboxMessage, Customer, Invoice
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
