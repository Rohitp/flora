"""
CRUD for Fora skill contexts.
Each skill has a built-in description; users add custom instructions that
get injected into the relevant pipeline prompts at runtime.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Setting

router = APIRouter(prefix="/skills", tags=["skills"])

# Canonical skill definitions — order matters for display
SKILL_DEFINITIONS = [
    {
        "id": "classification",
        "name": "Classification",
        "description": (
            "Reads incoming customer messages and determines intent: "
            "will pay, already paid, disputed, or unclear. "
            "Add rules here to refine how edge cases are classified."
        ),
    },
    {
        "id": "promise_to_pay",
        "name": "Promise to Pay",
        "description": (
            "Handles customers who commit to paying by a future date. "
            "Pauses reminders and schedules a follow-up. "
            "Add rules here — e.g. maximum extension days, tier-based policies."
        ),
    },
    {
        "id": "dispute",
        "name": "Dispute Handling",
        "description": (
            "Responds when a customer contests the invoice amount, quantity, "
            "or validity. Pauses reminders and escalates internally. "
            "Add rules here — e.g. escalation contacts, required evidence."
        ),
    },
    {
        "id": "reply",
        "name": "Reply Tone & Policy",
        "description": (
            "Controls how Fora writes all outbound replies — tone, sign-off, "
            "what to include or avoid. "
            "Add rules here — e.g. formal language only, always CC finance."
        ),
    },
]


def _get_context(db: Session, skill_id: str) -> str:
    setting = db.query(Setting).filter(
        Setting.scope == "global",
        Setting.key == f"skill_context_{skill_id}",
    ).first()
    return setting.value if setting else ""


class SkillContextUpdate(BaseModel):
    context: str


@router.get("")
def list_skills(db: Session = Depends(get_db)):
    return [
        {
            **skill,
            "context": _get_context(db, skill["id"]),
            "has_context": bool(_get_context(db, skill["id"])),
        }
        for skill in SKILL_DEFINITIONS
    ]


@router.put("/{skill_id}")
def update_skill_context(
    skill_id: str,
    body: SkillContextUpdate,
    db: Session = Depends(get_db),
):
    if skill_id not in {s["id"] for s in SKILL_DEFINITIONS}:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Unknown skill: {skill_id}")

    key = f"skill_context_{skill_id}"
    setting = db.query(Setting).filter(
        Setting.scope == "global",
        Setting.key == key,
    ).first()

    if setting:
        setting.value = body.context
        setting.updated_at = datetime.utcnow()
    else:
        db.add(Setting(scope="global", customer_id=None, key=key, value=body.context))

    db.commit()
    return {"skill_id": skill_id, "context": body.context}


@router.delete("/{skill_id}/context")
def clear_skill_context(skill_id: str, db: Session = Depends(get_db)):
    key = f"skill_context_{skill_id}"
    setting = db.query(Setting).filter(
        Setting.scope == "global",
        Setting.key == key,
    ).first()
    if setting:
        db.delete(setting)
        db.commit()
    return {"skill_id": skill_id, "context": ""}
