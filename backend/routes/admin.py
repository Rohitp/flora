from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import ScheduledAction, InboxMessage, ActionLog, Rule, Invoice, Setting, Customer
from schemas import ResetOut
from seed import seed

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset", response_model=ResetOut)
def reset_demo(db: Session = Depends(get_db)):
    """
    Wipe all transient state and return the app to its initial demo state:
    - Clears: scheduled_actions, inbox, action_log, rules
    - Resets invoice statuses back to their seeded state
    - Clears customer-specific settings (keeps global settings)
    - Does NOT delete customers — they are re-used
    Ready for the next demo run.
    """
    # Clear transient tables
    db.query(ScheduledAction).delete()
    db.query(InboxMessage).delete()
    db.query(ActionLog).delete()
    db.query(Rule).delete()

    # Clear customer-specific settings (keep global ones)
    db.query(Setting).filter(Setting.scope == "customer").delete()

    # Reset invoice statuses based on current due dates
    from datetime import date
    from seed import CUSTOMERS, get_due_date

    for seed_data in CUSTOMERS:
        due_date = get_due_date(seed_data["due_offset"])
        status = "current" if seed_data["due_offset"] >= 0 else "overdue"
        customer = db.query(Customer).filter(Customer.email == seed_data["email"]).first()
        if customer and customer.invoices:
            inv = customer.invoices[0]
            inv.status = status
            inv.due_date = due_date  # reset due dates relative to today

    # Re-seed customer settings
    from seed import CUSTOMER_SETTINGS
    for customer_name, settings in CUSTOMER_SETTINGS.items():
        customer = db.query(Customer).filter(Customer.name == customer_name).first()
        if customer:
            for key, value in settings:
                db.add(Setting(scope="customer", customer_id=customer.id, key=key, value=value))

    db.commit()

    return ResetOut(reset=True, message="Demo reset complete. Rules cleared, timelines wiped, invoice statuses restored.")
