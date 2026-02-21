from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Customer, Invoice, Setting
from schemas import CustomerOut, InvoiceSummary, SettingOut

router = APIRouter(prefix="/customers", tags=["customers"])


def _invoice_to_summary(inv: Invoice) -> InvoiceSummary:
    today = date.today()
    delta = (inv.due_date - today).days
    return InvoiceSummary(
        id=inv.id,
        invoice_number=inv.invoice_number,
        amount=inv.amount,
        due_date=inv.due_date,
        status=inv.status,
        days_overdue=abs(delta) if delta < 0 else None,
        days_until_due=delta if delta >= 0 else None,
    )


def _customer_to_out(customer: Customer) -> CustomerOut:
    invoices = [_invoice_to_summary(i) for i in customer.invoices]
    settings = [SettingOut.model_validate(s) for s in customer.settings]
    total = sum(i.amount for i in customer.invoices if i.status not in ("resolved",))
    return CustomerOut(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        initials=customer.initials,
        color=customer.color,
        invoices=invoices,
        settings=settings,
        total_outstanding=total,
    )


@router.get("", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    customers = (
        db.query(Customer)
        .options(joinedload(Customer.invoices), joinedload(Customer.settings))
        .order_by(Customer.id)
        .all()
    )
    return [_customer_to_out(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = (
        db.query(Customer)
        .options(joinedload(Customer.invoices), joinedload(Customer.settings))
        .filter(Customer.id == customer_id)
        .first()
    )
    if not customer:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Customer not found")
    return _customer_to_out(customer)


@router.get("/{customer_id}/settings", response_model=list[SettingOut])
def get_customer_settings(customer_id: int, db: Session = Depends(get_db)):
    """
    Returns merged settings for a customer:
    customer-specific settings override global settings with the same key.
    This is what the AI agent reads before making decisions.
    """
    global_settings = db.query(Setting).filter(Setting.scope == "global").all()
    customer_settings = (
        db.query(Setting)
        .filter(Setting.scope == "customer", Setting.customer_id == customer_id)
        .all()
    )
    # Merge: customer overrides global
    merged = {s.key: s for s in global_settings}
    for s in customer_settings:
        merged[s.key] = s
    return [SettingOut.model_validate(s) for s in merged.values()]
