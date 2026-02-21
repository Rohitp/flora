"""
Shared fixtures for all tests.

Design:
- session-scoped engine using in-memory SQLite (fast, isolated from production flora.db)
- function-scoped db session: each test gets a clean slate (all rows deleted after)
- function-scoped client: FastAPI TestClient with get_db overridden to use test session
- The app lifespan (seed + poller) is NOT triggered — TestClient used without context manager
- Factory helpers create ORM objects and flush so IDs are available
"""
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app
from models import (
    Customer, Invoice, Rule, ScheduledAction,
    InboxMessage, ActionLog, Setting,
)

# StaticPool forces all sessions to reuse the same underlying SQLite connection,
# so tables created once are visible to every subsequent session.
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(bind=TEST_ENGINE)
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture
def db():
    session = _TestSession()
    yield session
    session.rollback()
    # Wipe all rows between tests
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager — skips the lifespan (no seed, no poller)
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── Factories ──────────────────────────────────────────────────────────────────

def make_customer(db, name="Test Corp", email="test@example.com",
                  initials="TC", color="bg-blue-600"):
    c = Customer(name=name, email=email, initials=initials, color=color)
    db.add(c)
    db.flush()
    return c


def make_invoice(db, customer_id, invoice_number="IN-0001", amount=10000.0,
                 due_offset=7, status=None):
    due_date = date.today() + timedelta(days=due_offset)
    if status is None:
        status = "current" if due_offset >= 0 else "overdue"
    inv = Invoice(customer_id=customer_id, invoice_number=invoice_number,
                  amount=amount, due_date=due_date, status=status)
    db.add(inv)
    db.flush()
    return inv


def make_rule(db, name="Test Rule", day_offset=7, audience="Customer",
              type_="email", frequency="Once", status="active"):
    r = Rule(name=name, day_offset=day_offset, audience=audience,
             type=type_, frequency=frequency, status=status)
    db.add(r)
    db.flush()
    return r


def make_scheduled_action(db, invoice_id, rule_id=None, action_name="Test Action",
                           day_offset=7, status="pending", color="blue",
                           ai_generated=False, due_offset=7, audience="Customer"):
    sa = ScheduledAction(
        invoice_id=invoice_id,
        rule_id=rule_id,
        action_name=action_name,
        scheduled_date=date.today() + timedelta(days=due_offset),
        audience=audience,
        day_offset=day_offset,
        status=status,
        color=color,
        ai_generated=ai_generated,
    )
    db.add(sa)
    db.flush()
    return sa


def make_inbox_message(db, customer_id=None, invoice_id=None,
                        from_email="test@example.com", subject="Invoice Reminder",
                        body="Please pay", intent="unclear",
                        status="open", ticket_id="TKT-0001",
                        draft_reply="Dear customer..."):
    msg = InboxMessage(
        ticket_id=ticket_id,
        customer_id=customer_id,
        invoice_id=invoice_id,
        from_email=from_email,
        subject=subject,
        body=body,
        thread_key=f"{from_email}::{subject}",
        thread_count=1,
        intent=intent,
        confidence=0.9,
        status=status,
        draft_reply=draft_reply,
    )
    db.add(msg)
    db.flush()
    return msg


def make_global_settings(db):
    for key, value in [
        ("reply_sign_off", "AR Team"),
        ("company_name", "Test Co"),
        ("contact_language", "English"),
    ]:
        db.add(Setting(scope="global", customer_id=None, key=key, value=value))
    db.flush()


def make_customer_setting(db, customer_id, key, value):
    s = Setting(scope="customer", customer_id=customer_id, key=key, value=value)
    db.add(s)
    db.flush()
    return s
