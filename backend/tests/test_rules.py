from datetime import date
from tests.conftest import make_customer, make_invoice, make_rule, make_scheduled_action


def test_list_rules_empty(client):
    resp = client.get("/rules")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_rules(client, db):
    make_rule(db, name="Soft Reminder -7d", day_offset=-7)
    make_rule(db, name="Overdue Notice +8d", day_offset=8, audience="Customer")
    make_rule(db, name="Internal Escalation", day_offset=29, audience="Internal", type_="escalation")
    db.commit()

    resp = client.get("/rules")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    names = {r["name"] for r in data}
    assert "Soft Reminder -7d" in names


def test_list_rules_fields(client, db):
    make_rule(db, name="My Rule", day_offset=-7, audience="Customer",
              type_="email", frequency="Once", status="active")
    db.commit()

    r = client.get("/rules").json()[0]
    assert r["name"] == "My Rule"
    assert r["day_offset"] == -7
    assert r["audience"] == "Customer"
    assert r["type"] == "email"
    assert r["frequency"] == "Once"
    assert r["status"] == "active"


def test_upload_rules_success(client, db, mocker):
    c = make_customer(db)
    make_invoice(db, c.id, invoice_number="IN-001")
    db.commit()

    mocker.patch("routes.rules.parse_and_schedule", return_value={
        "rules": [
            {"name": "Reminder -7d", "day_offset": -7, "audience": "Customer",
             "type": "email", "frequency": "Once"},
        ],
        "scheduled_actions": [
            {"invoice_number": "IN-001", "action_name": "Reminder -7d",
             "scheduled_date": str(date.today()), "audience": "Customer",
             "day_offset": -7, "status": "pending", "color": "blue"},
        ],
    })

    resp = client.post(
        "/rules/upload",
        files={"file": ("rules.pdf", b"%PDF-fake", "application/pdf")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["rules_count"] == 1
    assert data["invoices_scheduled"] == 1


def test_upload_rules_replaces_existing(client, db, mocker):
    c = make_customer(db)
    make_invoice(db, c.id, invoice_number="IN-001")
    make_rule(db, name="Old Rule")
    db.commit()

    mocker.patch("routes.rules.parse_and_schedule", return_value={
        "rules": [{"name": "New Rule", "day_offset": 7, "audience": "Customer",
                   "type": "email", "frequency": "Once"}],
        "scheduled_actions": [],
    })

    client.post("/rules/upload", files={"file": ("r.pdf", b"%PDF", "application/pdf")})

    rules = client.get("/rules").json()
    assert len(rules) == 1
    assert rules[0]["name"] == "New Rule"


def test_upload_rules_unknown_invoice_skipped(client, db, mocker):
    # Agent returns action for invoice that doesn't exist — should be silently skipped
    c = make_customer(db)
    make_invoice(db, c.id, invoice_number="IN-001")
    db.commit()

    mocker.patch("routes.rules.parse_and_schedule", return_value={
        "rules": [{"name": "Rule A", "day_offset": 7, "audience": "Customer",
                   "type": "email", "frequency": "Once"}],
        "scheduled_actions": [
            {"invoice_number": "IN-NONEXISTENT", "action_name": "Rule A",
             "scheduled_date": str(date.today()), "audience": "Customer",
             "day_offset": 7, "status": "pending", "color": "blue"},
        ],
    })

    resp = client.post("/rules/upload", files={"file": ("r.pdf", b"%PDF", "application/pdf")})
    assert resp.status_code == 200
    assert resp.json()["invoices_scheduled"] == 0


def test_pause_active_rule(client, db):
    r = make_rule(db, status="active")
    db.commit()

    resp = client.post(f"/rules/{r.id}/pause")
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"


def test_unpause_paused_rule(client, db):
    r = make_rule(db, status="paused")
    db.commit()

    resp = client.post(f"/rules/{r.id}/pause")
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


def test_pause_rule_toggle_is_idempotent_cycle(client, db):
    r = make_rule(db, status="active")
    db.commit()

    client.post(f"/rules/{r.id}/pause")   # → paused
    client.post(f"/rules/{r.id}/pause")   # → active
    resp = client.post(f"/rules/{r.id}/pause")  # → paused
    assert resp.json()["status"] == "paused"


def test_pause_rule_not_found(client):
    resp = client.post("/rules/9999/pause")
    assert resp.status_code == 404
