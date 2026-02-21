from tests.conftest import (
    make_customer, make_invoice, make_rule, make_scheduled_action,
    make_inbox_message, make_customer_setting,
)
from models import ActionLog


def test_reset_clears_rules(client, db):
    make_rule(db)
    make_rule(db, name="Rule 2", day_offset=15)
    db.commit()
    assert len(client.get("/rules").json()) == 2

    client.post("/admin/reset")
    assert client.get("/rules").json() == []


def test_reset_clears_scheduled_actions(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    make_scheduled_action(db, inv.id)
    db.commit()

    client.post("/admin/reset")
    assert client.get(f"/invoices/{inv.id}/schedule").json()["scheduled_actions"] == []


def test_reset_clears_inbox(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    make_inbox_message(db, c.id, inv.id)
    db.commit()
    assert len(client.get("/inbox").json()) == 1

    client.post("/admin/reset")
    assert client.get("/inbox").json() == []


def test_reset_clears_action_log(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    db.add(ActionLog(invoice_id=inv.id, action_type="classify", description="Test"))
    db.commit()

    client.post("/admin/reset")
    assert client.get("/dashboard/action-log").json() == []


def test_reset_keeps_customers(client, db):
    make_customer(db, name="Keep Me", email="keep@test.com")
    make_customer(db, name="Keep Me Too", email="keep2@test.com")
    db.commit()

    client.post("/admin/reset")
    customers = client.get("/customers").json()
    assert len(customers) == 2
    names = {c["name"] for c in customers}
    assert "Keep Me" in names


def test_reset_removes_customer_specific_settings(client, db):
    c = make_customer(db)
    make_customer_setting(db, c.id, "agent_notes", "Will be cleared")
    db.commit()

    client.post("/admin/reset")
    # Customer-specific settings cleared
    settings = client.get(f"/customers/{c.id}/settings").json()
    keys = {s["key"] for s in settings}
    assert "agent_notes" not in keys


def test_reset_returns_success(client):
    resp = client.post("/admin/reset")
    assert resp.status_code == 200
    data = resp.json()
    assert data["reset"] is True
    assert "message" in data
