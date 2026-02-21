from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Invoice, InboxMessage, ActionLog
from schemas import DashboardOut, DashboardKPIs, ActionLogOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardOut)
def get_summary(db: Session = Depends(get_db)):
    today = date.today()
    invoices = db.query(Invoice).all()

    total_outstanding = 0.0
    current = 0.0
    overdue_1_to_30 = 0.0
    overdue_30_plus = 0.0
    promise_to_pay = 0.0
    disputes = 0.0

    for inv in invoices:
        if inv.status == "resolved":
            continue
        total_outstanding += inv.amount
        delta = (today - inv.due_date).days  # positive = days overdue

        if inv.status == "disputed":
            disputes += inv.amount
        elif inv.status == "paused":
            # Paused = promise to pay
            promise_to_pay += inv.amount
        elif delta <= 0:
            current += inv.amount
        elif delta <= 30:
            overdue_1_to_30 += inv.amount
        else:
            overdue_30_plus += inv.amount

    kpis = DashboardKPIs(
        total_outstanding=total_outstanding,
        current=current,
        overdue_1_to_30=overdue_1_to_30,
        overdue_30_plus=overdue_30_plus,
        promise_to_pay=promise_to_pay,
        disputes=disputes,
    )

    recent_logs = (
        db.query(ActionLog)
        .order_by(ActionLog.created_at.desc())
        .limit(10)
        .all()
    )

    return DashboardOut(
        kpis=kpis,
        recent_activity=[ActionLogOut.model_validate(log) for log in recent_logs],
    )


@router.get("/action-log", response_model=list[ActionLogOut])
def get_action_log(limit: int = 20, db: Session = Depends(get_db)):
    logs = (
        db.query(ActionLog)
        .order_by(ActionLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [ActionLogOut.model_validate(log) for log in logs]
