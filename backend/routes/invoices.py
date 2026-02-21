from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Invoice, Customer, ScheduledAction
from schemas import InvoiceScheduleOut, InvoiceSummary, CustomerOut, ScheduledActionOut, SettingOut
from routes.customers import _invoice_to_summary, _customer_to_out

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceSummary])
def list_invoices(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).order_by(Invoice.id).all()
    return [_invoice_to_summary(i) for i in invoices]


@router.get("/{invoice_id}/schedule", response_model=InvoiceScheduleOut)
def get_invoice_schedule(invoice_id: int, db: Session = Depends(get_db)):
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.customer).joinedload(Customer.invoices),
            joinedload(Invoice.customer).joinedload(Customer.settings),
            joinedload(Invoice.scheduled_actions),
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    actions = sorted(invoice.scheduled_actions, key=lambda a: a.scheduled_date)

    return InvoiceScheduleOut(
        invoice=_invoice_to_summary(invoice),
        customer=_customer_to_out(invoice.customer),
        scheduled_actions=[ScheduledActionOut.model_validate(a) for a in actions],
    )
