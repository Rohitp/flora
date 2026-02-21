"""
Schedule adjustment logic — applied after AI intent classification.
Schedule generation itself is done by the rules agent (services/rules_agent.py).
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from models import Invoice, ScheduledAction, ActionLog


def apply_will_pay_later(
    db: Session,
    invoice: Invoice,
    inbox_id: int,
    promised_date: date,
) -> list[str]:
    """Pause all pending actions, add AI follow-up 1 day after promised date."""
    actions_taken = []

    pending = (
        db.query(ScheduledAction)
        .filter(
            ScheduledAction.invoice_id == invoice.id,
            ScheduledAction.status == "pending",
            ScheduledAction.ai_generated == False,
        )
        .all()
    )
    for action in pending:
        action.status = "paused"
        action.color = "orange"
        action.note = f"Paused — payment commitment received (promised {promised_date})"

    paused_count = len(pending)

    # Set invoice status to paused (promise to pay)
    invoice.status = "paused"

    # Create AI follow-up action
    follow_up_date = promised_date + timedelta(days=1)
    follow_up = ScheduledAction(
        invoice_id=invoice.id,
        rule_id=None,
        action_name="AI Follow-up Check — Promise to Pay",
        scheduled_date=follow_up_date,
        audience="Customer",
        day_offset=(follow_up_date - invoice.due_date).days,
        status="pending",
        color="blue",
        ai_generated=True,
        note=f"Auto-scheduled by AI agent — customer promised payment by {promised_date}",
    )
    db.add(follow_up)

    db.add(ActionLog(
        invoice_id=invoice.id,
        inbox_id=inbox_id,
        action_type="pause",
        description=f"Paused {paused_count} pending reminder(s) for {invoice.invoice_number} — customer promised payment by {promised_date}",
    ))
    db.add(ActionLog(
        invoice_id=invoice.id,
        inbox_id=inbox_id,
        action_type="schedule",
        description=f"AI follow-up check scheduled for {follow_up_date} (1 day after promised payment date)",
    ))

    db.commit()
    actions_taken.append(f"Paused {paused_count} pending reminders")
    actions_taken.append(f"Follow-up check scheduled for {follow_up_date}")
    return actions_taken


def apply_already_paid(
    db: Session,
    invoice: Invoice,
    inbox_id: int,
) -> list[str]:
    """Cancel all pending actions, mark invoice resolved."""
    pending = (
        db.query(ScheduledAction)
        .filter(
            ScheduledAction.invoice_id == invoice.id,
            ScheduledAction.status.in_(["pending", "paused"]),
        )
        .all()
    )
    for action in pending:
        action.status = "cancelled"
        action.color = "grey"
        action.note = "Cancelled — customer confirmed payment received"

    cancelled_count = len(pending)
    invoice.status = "resolved"

    db.add(ActionLog(
        invoice_id=invoice.id,
        inbox_id=inbox_id,
        action_type="cancel",
        description=f"Cancelled {cancelled_count} scheduled action(s) for {invoice.invoice_number} — customer confirmed payment",
    ))
    db.add(ActionLog(
        invoice_id=invoice.id,
        inbox_id=inbox_id,
        action_type="resolve",
        description=f"Invoice {invoice.invoice_number} marked as resolved",
    ))

    db.commit()
    return [f"Cancelled {cancelled_count} actions", f"Invoice {invoice.invoice_number} marked resolved"]


def apply_disputed(
    db: Session,
    invoice: Invoice,
    inbox_id: int,
) -> list[str]:
    """Pause pending actions, mark invoice disputed, log escalation."""
    pending = (
        db.query(ScheduledAction)
        .filter(
            ScheduledAction.invoice_id == invoice.id,
            ScheduledAction.status == "pending",
            ScheduledAction.ai_generated == False,
        )
        .all()
    )
    for action in pending:
        action.status = "paused"
        action.color = "orange"
        action.note = "Paused — invoice under dispute"

    paused_count = len(pending)
    invoice.status = "disputed"

    # Immediate internal escalation action
    escalation = ScheduledAction(
        invoice_id=invoice.id,
        rule_id=None,
        action_name="AI Escalation — Invoice Disputed",
        scheduled_date=date.today(),
        audience="Internal",
        day_offset=(date.today() - invoice.due_date).days,
        status="sent",
        color="grey",
        ai_generated=True,
        note="Triggered immediately by AI agent — customer flagged dispute",
    )
    db.add(escalation)

    db.add(ActionLog(
        invoice_id=invoice.id,
        inbox_id=inbox_id,
        action_type="pause",
        description=f"Paused {paused_count} pending reminder(s) for {invoice.invoice_number} — invoice under dispute",
    ))
    db.add(ActionLog(
        invoice_id=invoice.id,
        inbox_id=inbox_id,
        action_type="escalate",
        description=f"Internal escalation created for {invoice.invoice_number} — dispute flagged to manager",
    ))

    db.commit()
    return [f"Paused {paused_count} reminders", "Internal escalation triggered", "Invoice marked as disputed"]


def apply_unclear(
    db: Session,
    invoice: Invoice,
    inbox_id: int,
) -> list[str]:
    """Log the message, no automatic schedule changes, flag for human review."""
    db.add(ActionLog(
        invoice_id=invoice.id,
        inbox_id=inbox_id,
        action_type="flag",
        description=f"Message for {invoice.invoice_number} flagged for human review — intent unclear",
    ))
    db.commit()
    return ["Flagged for human review — no automatic actions taken"]
