from tests.conftest import make_customer, make_invoice, make_rule, make_scheduled_action


def test_list_invoices_empty(client):
    resp = client.get("/invoices")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_invoices(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, invoice_number="IN-001", amount=5000, due_offset=7)
    make_invoice(db, c.id, invoice_number="IN-002", amount=3000, due_offset=-5)
    db.commit()

    resp = client.get("/invoices")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    numbers = {i["invoice_number"] for i in data}
    assert numbers == {"IN-001", "IN-002"}


def test_get_schedule_not_found(client):
    resp = client.get("/invoices/9999/schedule")
    assert resp.status_code == 404


def test_get_timeline_not_found(client):
    resp = client.get("/invoices/9999/timeline")
    assert resp.status_code == 404


def test_get_schedule_no_actions(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    db.commit()

    resp = client.get(f"/invoices/{inv.id}/schedule")
    assert resp.status_code == 200
    data = resp.json()
    assert data["scheduled_actions"] == []
    assert data["invoice"]["invoice_number"] == "IN-0001"
    assert data["customer"]["name"] == "Test Corp"


def test_get_schedule_with_actions_sorted_by_date(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    r = make_rule(db)
    # Insert out of order
    make_scheduled_action(db, inv.id, r.id, due_offset=15)
    make_scheduled_action(db, inv.id, r.id, due_offset=-7)
    make_scheduled_action(db, inv.id, r.id, due_offset=8)
    db.commit()

    resp = client.get(f"/invoices/{inv.id}/schedule")
    assert resp.status_code == 200
    offsets = [a["day_offset"] for a in resp.json()["scheduled_actions"]]
    assert offsets == sorted(offsets)  # returned in date order


def test_get_timeline_alias_same_as_schedule(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    make_scheduled_action(db, inv.id)
    db.commit()

    schedule = client.get(f"/invoices/{inv.id}/schedule").json()
    timeline = client.get(f"/invoices/{inv.id}/timeline").json()
    assert schedule == timeline


def test_schedule_includes_ai_generated_flag(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    make_scheduled_action(db, inv.id, ai_generated=False)
    make_scheduled_action(db, inv.id, ai_generated=True, due_offset=14)
    db.commit()

    actions = client.get(f"/invoices/{inv.id}/schedule").json()["scheduled_actions"]
    flags = {a["ai_generated"] for a in actions}
    assert flags == {True, False}
