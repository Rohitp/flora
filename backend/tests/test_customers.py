import pytest
from tests.conftest import (
    make_customer, make_invoice, make_global_settings, make_customer_setting,
)


def test_list_customers_empty(client):
    resp = client.get("/customers")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_customers(client, db):
    make_customer(db, name="Acme", email="acme@test.com")
    make_customer(db, name="Beta Corp", email="beta@test.com")
    db.commit()

    resp = client.get("/customers")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    names = {c["name"] for c in data}
    assert names == {"Acme", "Beta Corp"}


def test_list_customers_includes_invoices(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, invoice_number="IN-001", amount=5000)
    db.commit()

    data = client.get("/customers").json()
    assert len(data[0]["invoices"]) == 1
    assert data[0]["invoices"][0]["invoice_number"] == "IN-001"


def test_list_customers_total_outstanding_excludes_resolved(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, invoice_number="IN-001", amount=5000, status="current")
    make_invoice(db, c.id, invoice_number="IN-002", amount=3000, status="resolved")
    db.commit()

    data = client.get("/customers").json()
    assert data[0]["total_outstanding"] == 5000.0


def test_get_customer(client, db):
    c = make_customer(db, name="Specific Corp", email="specific@test.com")
    db.commit()

    resp = client.get(f"/customers/{c.id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Specific Corp"
    assert resp.json()["email"] == "specific@test.com"


def test_get_customer_not_found(client):
    resp = client.get("/customers/9999")
    assert resp.status_code == 404


def test_get_customer_settings_global_only(client, db):
    c = make_customer(db)
    make_global_settings(db)
    db.commit()

    resp = client.get(f"/customers/{c.id}/settings")
    assert resp.status_code == 200
    keys = {s["key"] for s in resp.json()}
    assert "reply_sign_off" in keys
    assert "company_name" in keys


def test_get_customer_settings_customer_overrides_global(client, db):
    c = make_customer(db)
    make_global_settings(db)
    make_customer_setting(db, c.id, "reply_sign_off", "Custom Sign Off")
    db.commit()

    resp = client.get(f"/customers/{c.id}/settings")
    settings = {s["key"]: s["value"] for s in resp.json()}
    # Customer-specific value overrides global
    assert settings["reply_sign_off"] == "Custom Sign Off"
    # Global-only keys still present
    assert settings["company_name"] == "Test Co"


def test_patch_customer_settings_creates_new(client, db):
    c = make_customer(db)
    db.commit()

    resp = client.patch(f"/customers/{c.id}/settings", json={"agent_notes": "VIP customer"})
    assert resp.status_code == 200
    settings = {s["key"]: s["value"] for s in resp.json()}
    assert settings["agent_notes"] == "VIP customer"


def test_patch_customer_settings_updates_existing(client, db):
    c = make_customer(db)
    make_customer_setting(db, c.id, "agent_notes", "Original notes")
    db.commit()

    resp = client.patch(f"/customers/{c.id}/settings", json={"agent_notes": "Updated notes"})
    assert resp.status_code == 200
    settings = {s["key"]: s["value"] for s in resp.json()}
    assert settings["agent_notes"] == "Updated notes"


def test_patch_customer_settings_multiple_keys(client, db):
    c = make_customer(db)
    db.commit()

    resp = client.patch(f"/customers/{c.id}/settings", json={
        "agent_notes": "Handle with care",
        "dispute_route": "legal",
        "preferred_contact_time": "morning",
    })
    assert resp.status_code == 200
    settings = {s["key"]: s["value"] for s in resp.json()}
    assert settings["dispute_route"] == "legal"
    assert settings["preferred_contact_time"] == "morning"


def test_patch_customer_settings_not_found(client):
    resp = client.patch("/customers/9999/settings", json={"agent_notes": "test"})
    assert resp.status_code == 404


def test_invoice_days_overdue(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, due_offset=-10)
    db.commit()

    data = client.get("/customers").json()
    inv = data[0]["invoices"][0]
    assert inv["days_overdue"] == 10
    assert inv["days_until_due"] is None


def test_invoice_days_until_due(client, db):
    c = make_customer(db)
    make_invoice(db, c.id, due_offset=5)
    db.commit()

    data = client.get("/customers").json()
    inv = data[0]["invoices"][0]
    assert inv["days_until_due"] == 5
    assert inv["days_overdue"] is None
