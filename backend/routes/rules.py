from datetime import date
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Rule, Invoice, ScheduledAction, Customer
from schemas import RuleOut, UploadRulesOut
from services.rules_agent import parse_and_schedule

router = APIRouter(prefix="/rules", tags=["rules"])


def _apply_agent_output(db: Session, result: dict) -> tuple[int, int]:
    """Persist rules and scheduled_actions returned by the Claude agent."""
    # Wipe existing
    db.query(ScheduledAction).delete()
    db.query(Rule).delete()
    db.commit()

    # Build invoice lookup by invoice_number
    invoices = {inv.invoice_number: inv for inv in db.query(Invoice).all()}

    # Persist rules
    rule_map: dict[str, Rule] = {}
    for r in result.get("rules", []):
        rule = Rule(
            name=r["name"],
            day_offset=int(r["day_offset"]),
            audience=r["audience"],
            type=r.get("type", "email"),
            frequency=r.get("frequency", "Once"),
            status="active",
        )
        db.add(rule)
        db.flush()
        rule_map[r["name"]] = rule

    rules_count = len(rule_map)

    # Persist scheduled actions
    scheduled_invoices = set()
    for action in result.get("scheduled_actions", []):
        inv_number = action["invoice_number"]
        invoice = invoices.get(inv_number)
        if not invoice:
            continue

        try:
            sched_date = date.fromisoformat(action["scheduled_date"])
        except (ValueError, KeyError):
            continue

        rule = rule_map.get(action["action_name"])

        sa = ScheduledAction(
            invoice_id=invoice.id,
            rule_id=rule.id if rule else None,
            action_name=action["action_name"],
            scheduled_date=sched_date,
            audience=action.get("audience", "Customer"),
            day_offset=int(action.get("day_offset", 0)),
            status=action.get("status", "pending"),
            color=action.get("color", "blue"),
            ai_generated=False,
        )
        db.add(sa)
        scheduled_invoices.add(inv_number)

    db.commit()
    return rules_count, len(scheduled_invoices)


@router.post("/{rule_id}/pause", response_model=RuleOut)
def toggle_rule_pause(rule_id: int, db: Session = Depends(get_db)):
    """Toggle a rule between active and paused. Paused rules are excluded from future scheduling runs."""
    from fastapi import HTTPException
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.status = "paused" if rule.status == "active" else "active"
    db.commit()
    db.refresh(rule)
    return RuleOut.model_validate(rule)


@router.get("", response_model=list[RuleOut])
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(Rule).order_by(Rule.id).all()
    return [RuleOut.model_validate(r) for r in rules]


@router.post("/upload", response_model=UploadRulesOut)
async def upload_rules(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    filename = file.filename or "rules.pdf"

    # Build invoice context for the agent
    invoices_raw = (
        db.query(Invoice, Customer)
        .join(Customer)
        .all()
    )
    invoice_context = [
        {
            "invoice_number": inv.invoice_number,
            "due_date": str(inv.due_date),
            "customer_name": customer.name,
        }
        for inv, customer in invoices_raw
    ]

    try:
        result = parse_and_schedule(
            file_content=content,
            invoices=invoice_context,
            today=date.today(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rules agent failed: {e}")

    rules_count, invoices_scheduled = _apply_agent_output(db, result)

    return UploadRulesOut(
        rules_count=rules_count,
        invoices_scheduled=invoices_scheduled,
        message=f"AI agent loaded {rules_count} rules and scheduled {invoices_scheduled} invoices.",
    )
