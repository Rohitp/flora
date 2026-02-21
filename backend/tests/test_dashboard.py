from tests.conftest import make_customer, make_invoice
from models import ActionLog


def test_summary_empty(client):
    resp = client.get("/dashboard/summary")
    assert resp.status_code == 200
    kpis = resp.json()["kpis"]
    assert kpis["total_outstanding"] == 0.0
    assert kpis["current"] == 0.0
    assert kpis["overdue_1_to_30"] == 0.0
    assert kpis["overdue_30_plus"] == 0.0
    assert kpis["promise_to_pay"] == 0.0
    assert kpis["disputes"] == 0.0


def test_summary_current_invoice(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, amount=10000, due_offset=5, status="current")
    db.commit()

    kpis = client.get("/dashboard/summary").json()["kpis"]
    assert kpis["current"] == 10000.0
    assert kpis["total_outstanding"] == 10000.0
    assert kpis["overdue_1_to_30"] == 0.0


def test_summary_overdue_1_to_30(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, amount=8000, due_offset=-15, status="overdue")
    db.commit()

    kpis = client.get("/dashboard/summary").json()["kpis"]
    assert kpis["overdue_1_to_30"] == 8000.0
    assert kpis["overdue_30_plus"] == 0.0


def test_summary_overdue_30_plus(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, amount=5000, due_offset=-45, status="overdue")
    db.commit()

    kpis = client.get("/dashboard/summary").json()["kpis"]
    assert kpis["overdue_30_plus"] == 5000.0
    assert kpis["overdue_1_to_30"] == 0.0


def test_summary_promise_to_pay(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, amount=12000, due_offset=-10, status="paused")
    db.commit()

    kpis = client.get("/dashboard/summary").json()["kpis"]
    assert kpis["promise_to_pay"] == 12000.0


def test_summary_disputed(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, amount=7500, due_offset=-20, status="disputed")
    db.commit()

    kpis = client.get("/dashboard/summary").json()["kpis"]
    assert kpis["disputes"] == 7500.0


def test_summary_resolved_excluded(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, amount=5000, status="resolved")
    db.commit()

    kpis = client.get("/dashboard/summary").json()["kpis"]
    assert kpis["total_outstanding"] == 0.0


def test_summary_multiple_invoices_bucketed_correctly(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, invoice_number="IN-001", amount=1000, due_offset=10, status="current")
    make_invoice(db, c.id, invoice_number="IN-002", amount=2000, due_offset=-10, status="overdue")
    make_invoice(db, c.id, invoice_number="IN-003", amount=3000, due_offset=-40, status="overdue")
    make_invoice(db, c.id, invoice_number="IN-004", amount=4000, status="resolved")
    db.commit()

    kpis = client.get("/dashboard/summary").json()["kpis"]
    assert kpis["total_outstanding"] == 6000.0  # 1k + 2k + 3k (not resolved)
    assert kpis["current"] == 1000.0
    assert kpis["overdue_1_to_30"] == 2000.0
    assert kpis["overdue_30_plus"] == 3000.0


def test_action_log_empty(client):
    resp = client.get("/dashboard/action-log")
    assert resp.status_code == 200
    assert resp.json() == []


def test_action_log_returns_entries(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    db.add(ActionLog(invoice_id=inv.id, action_type="classify",
                     description="Classified as will_pay_later"))
    db.add(ActionLog(invoice_id=inv.id, action_type="pause",
                     description="Paused 3 reminders"))
    db.commit()

    resp = client.get("/dashboard/action-log")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_action_log_limit(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    for i in range(15):
        db.add(ActionLog(invoice_id=inv.id, action_type="classify",
                         description=f"Action {i}"))
    db.commit()

    assert len(client.get("/dashboard/action-log?limit=5").json()) == 5
    assert len(client.get("/dashboard/action-log?limit=20").json()) == 15


def test_summary_recent_activity_in_response(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    db.add(ActionLog(invoice_id=inv.id, action_type="classify",
                     description="Test action"))
    db.commit()

    data = client.get("/dashboard/summary").json()
    assert "recent_activity" in data
    assert len(data["recent_activity"]) == 1
    assert data["recent_activity"][0]["action_type"] == "classify"
