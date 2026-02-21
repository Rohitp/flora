"""
Unit tests for the email processing pipeline.
External services (Claude classifier, reply generator) are mocked.
DB operations run against the in-memory test DB.
"""
from datetime import date, timedelta
import pytest
from tests.conftest import (
    make_customer, make_invoice, make_scheduled_action,
    make_global_settings, make_customer_setting,
)
from services.pipeline import process_email
from models import InboxMessage, ScheduledAction, ActionLog


CLASSIFY_WILL_PAY = {
    "intent": "will_pay_later",
    "confidence": 0.95,
    "promised_date": str(date.today() + timedelta(days=7)),
    "summary": "Customer promises payment next week",
}
CLASSIFY_ALREADY_PAID = {
    "intent": "already_paid",
    "confidence": 0.98,
    "promised_date": None,
    "summary": "Customer confirms payment sent",
}
CLASSIFY_DISPUTED = {
    "intent": "disputed",
    "confidence": 0.90,
    "promised_date": None,
    "summary": "Customer disputes the invoice amount",
}
CLASSIFY_UNCLEAR = {
    "intent": "unclear",
    "confidence": 0.5,
    "promised_date": None,
    "summary": "Intent unclear",
}


@pytest.fixture(autouse=True)
def mock_services(mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_WILL_PAY)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="Dear customer, noted.")


# ── Customer matching ──────────────────────────────────────────────────────────

def test_matches_customer_by_email(db, mock_services):
    c = make_customer(db, email="payer@test.com")
    make_invoice(db, c.id)
    db.commit()

    msg = process_email(db, from_email="payer@test.com", subject="Invoice", body="I'll pay")
    assert msg.customer_id == c.id


def test_unknown_sender_no_customer_id(db, mock_services):
    msg = process_email(db, from_email="nobody@unknown.com", subject="Hi", body="Random email")
    assert msg.customer_id is None
    assert msg.intent == "unclear"


def test_unknown_sender_status_is_needs_review(db, mock_services):
    msg = process_email(db, from_email="nobody@unknown.com", subject="Hi", body="?")
    assert msg.status == "needs_review"


# ── Ticket IDs ────────────────────────────────────────────────────────────────

def test_first_ticket_is_tkt_0001(db, mock_services):
    c = make_customer(db)
    make_invoice(db, c.id)
    db.commit()

    msg = process_email(db, from_email=c.email, subject="Test", body="body")
    assert msg.ticket_id == "TKT-0001"


def test_ticket_ids_are_sequential(db, mock_services):
    c = make_customer(db)
    make_invoice(db, c.id)
    c2 = make_customer(db, name="B", email="b@test.com")
    make_invoice(db, c2.id, invoice_number="IN-002")
    db.commit()

    m1 = process_email(db, from_email=c.email, subject="First", body="a")
    m2 = process_email(db, from_email=c2.email, subject="Second", body="b")
    assert m1.ticket_id == "TKT-0001"
    assert m2.ticket_id == "TKT-0002"


# ── Thread matching ────────────────────────────────────────────────────────────

def test_same_thread_increments_count(db, mock_services):
    c = make_customer(db)
    make_invoice(db, c.id)
    db.commit()

    m1 = process_email(db, from_email=c.email, subject="Invoice Reminder", body="First message")
    m2 = process_email(db, from_email=c.email, subject="Re: Invoice Reminder", body="Reply")

    assert m1.ticket_id == m2.ticket_id
    db.refresh(m1)
    assert m1.thread_count == 2


def test_different_subject_creates_new_thread(db, mock_services):
    c = make_customer(db)
    make_invoice(db, c.id)
    db.commit()

    m1 = process_email(db, from_email=c.email, subject="Invoice A", body="msg1")
    m2 = process_email(db, from_email=c.email, subject="Invoice B", body="msg2")

    assert m1.ticket_id != m2.ticket_id


def test_thread_key_strips_re_prefix(db, mock_services):
    c = make_customer(db)
    make_invoice(db, c.id)
    db.commit()

    m1 = process_email(db, from_email=c.email, subject="Payment Due", body="a")
    m2 = process_email(db, from_email=c.email, subject="RE: Payment Due", body="b")
    m3 = process_email(db, from_email=c.email, subject="Fwd: Payment Due", body="c")

    # All should map to same thread
    assert m1.ticket_id == m2.ticket_id == m3.ticket_id


# ── Intent: will_pay_later ────────────────────────────────────────────────────

def test_will_pay_later_pauses_pending_actions(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_WILL_PAY)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    a1 = make_scheduled_action(db, inv.id, status="pending")
    a2 = make_scheduled_action(db, inv.id, status="pending", due_offset=10)
    db.commit()

    process_email(db, from_email=c.email, subject="Pay", body="I'll pay next week")

    db.refresh(a1)
    db.refresh(a2)
    assert a1.status == "paused"
    assert a2.status == "paused"


def test_will_pay_later_sets_invoice_paused(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_WILL_PAY)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    process_email(db, from_email=c.email, subject="Pay", body="Will pay")
    db.refresh(inv)
    assert inv.status == "paused"


def test_will_pay_later_creates_ai_followup(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_WILL_PAY)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    process_email(db, from_email=c.email, subject="Pay", body="Will pay")

    ai_actions = (
        db.query(ScheduledAction)
        .filter(ScheduledAction.invoice_id == inv.id, ScheduledAction.ai_generated == True)
        .all()
    )
    assert len(ai_actions) == 1
    assert "Follow-up" in ai_actions[0].action_name


def test_will_pay_later_does_not_pause_sent_actions(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_WILL_PAY)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    sent = make_scheduled_action(db, inv.id, status="sent", due_offset=-3)
    db.commit()

    process_email(db, from_email=c.email, subject="Pay", body="Will pay")
    db.refresh(sent)
    assert sent.status == "sent"  # unchanged


# ── Intent: already_paid ──────────────────────────────────────────────────────

def test_already_paid_cancels_pending_actions(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_ALREADY_PAID)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    a1 = make_scheduled_action(db, inv.id, status="pending")
    a2 = make_scheduled_action(db, inv.id, status="paused", due_offset=10)
    db.commit()

    process_email(db, from_email=c.email, subject="Paid", body="Already paid")
    db.refresh(a1)
    db.refresh(a2)
    assert a1.status == "cancelled"
    assert a2.status == "cancelled"


def test_already_paid_resolves_invoice(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_ALREADY_PAID)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    process_email(db, from_email=c.email, subject="Paid", body="Already paid")
    db.refresh(inv)
    assert inv.status == "resolved"


# ── Intent: disputed ─────────────────────────────────────────────────────────

def test_disputed_marks_invoice_disputed(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_DISPUTED)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    process_email(db, from_email=c.email, subject="Dispute", body="I dispute this")
    db.refresh(inv)
    assert inv.status == "disputed"


def test_disputed_creates_internal_escalation(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_DISPUTED)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    process_email(db, from_email=c.email, subject="Dispute", body="I dispute this")

    escalations = (
        db.query(ScheduledAction)
        .filter(
            ScheduledAction.invoice_id == inv.id,
            ScheduledAction.audience == "Internal",
            ScheduledAction.ai_generated == True,
        )
        .all()
    )
    assert len(escalations) == 1


# ── Intent: unclear ───────────────────────────────────────────────────────────

def test_unclear_flags_for_review(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_UNCLEAR)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    msg = process_email(db, from_email=c.email, subject="?", body="huh")
    assert msg.status == "needs_review"


def test_unclear_does_not_change_invoice_status(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_UNCLEAR)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    process_email(db, from_email=c.email, subject="?", body="huh")
    db.refresh(inv)
    assert inv.status == "overdue"


# ── Invoice selection ─────────────────────────────────────────────────────────

def test_prefers_overdue_invoice_over_current(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_ALREADY_PAID)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    current_inv = make_invoice(db, c.id, invoice_number="IN-CURRENT", due_offset=10, status="current")
    overdue_inv = make_invoice(db, c.id, invoice_number="IN-OVERDUE", due_offset=-5, status="overdue")
    db.commit()

    msg = process_email(db, from_email=c.email, subject="Paid", body="Paid already")
    assert msg.invoice_id == overdue_inv.id


# ── Draft reply ───────────────────────────────────────────────────────────────

def test_draft_reply_stored_on_message(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_WILL_PAY)
    mocker.patch("services.pipeline.generate_draft_reply",
                 return_value="Dear Customer, thank you for letting us know.")

    c = make_customer(db)
    make_invoice(db, c.id, due_offset=-5, status="overdue")
    db.commit()

    msg = process_email(db, from_email=c.email, subject="s", body="b")
    assert "thank you" in msg.draft_reply.lower()


# ── Action log ────────────────────────────────────────────────────────────────

def test_action_log_entries_created(db, mocker):
    mocker.patch("services.pipeline.classify_email", return_value=CLASSIFY_WILL_PAY)
    mocker.patch("services.pipeline.generate_draft_reply", return_value="ok")

    c = make_customer(db)
    inv = make_invoice(db, c.id, due_offset=-5, status="overdue")
    make_scheduled_action(db, inv.id, status="pending")
    db.commit()

    process_email(db, from_email=c.email, subject="s", body="b")

    logs = db.query(ActionLog).filter(ActionLog.invoice_id == inv.id).all()
    assert len(logs) >= 1
    action_types = {log.action_type for log in logs}
    assert "pause" in action_types or "schedule" in action_types
