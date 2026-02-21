from tests.conftest import (
    make_customer, make_invoice, make_inbox_message, make_scheduled_action,
)


def test_list_inbox_empty(client):
    resp = client.get("/inbox")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_inbox(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    make_inbox_message(db, c.id, inv.id, ticket_id="TKT-0001")
    make_inbox_message(db, c.id, inv.id, ticket_id="TKT-0002",
                        subject="Another thread", from_email="test@example.com")
    db.commit()

    resp = client.get("/inbox")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_list_inbox_newest_first(client, db):
    import time
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    make_inbox_message(db, c.id, inv.id, ticket_id="TKT-0001", subject="First")
    db.commit()
    make_inbox_message(db, c.id, inv.id, ticket_id="TKT-0002", subject="Second")
    db.commit()

    data = client.get("/inbox").json()
    assert data[0]["ticket_id"] == "TKT-0002"


def test_list_inbox_includes_customer_info(client, db):
    c = make_customer(db, name="Acme", initials="AC", color="bg-blue-600")
    inv = make_invoice(db, c.id)
    make_inbox_message(db, c.id, inv.id)
    db.commit()

    msg = client.get("/inbox").json()[0]
    assert msg["customer_name"] == "Acme"
    assert msg["customer_initials"] == "AC"
    assert msg["invoice_number"] == "IN-0001"


def test_get_ticket(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    make_inbox_message(db, c.id, inv.id, ticket_id="TKT-0042", subject="Test Subject")
    db.commit()

    resp = client.get("/inbox/TKT-0042")
    assert resp.status_code == 200
    assert resp.json()["subject"] == "Test Subject"


def test_get_ticket_not_found(client):
    resp = client.get("/inbox/TKT-9999")
    assert resp.status_code == 404


def test_simulate_message_unknown_customer(client):
    resp = client.post("/inbox/simulate", json={
        "customer_id": 9999,
        "body": "I will pay soon",
    })
    assert resp.status_code == 404


def test_simulate_message_success(client, db, mocker):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    db.commit()

    def fake_process_email(**kwargs):
        msg = make_inbox_message(db, customer_id=c.id, invoice_id=inv.id,
                                  intent="will_pay_later", status="classified")
        db.commit()
        db.refresh(msg)
        return msg

    mocker.patch("services.pipeline.process_email", side_effect=fake_process_email)

    resp = client.post("/inbox/simulate", json={
        "customer_id": c.id,
        "body": "We will pay next Friday",
        "subject": "Re: Invoice",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "will_pay_later"
    assert data["status"] == "classified"


def test_send_reply_success(client, db, mocker):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    msg = make_inbox_message(db, c.id, inv.id, draft_reply="Thank you for your payment.")
    db.commit()

    mocker.patch("services.gmail_sender.send_reply", return_value=True)

    resp = client.post(f"/inbox/{msg.ticket_id}/send-reply", json={"body": "Custom reply"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "closed"


def test_send_reply_uses_draft_when_no_body(client, db, mocker):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    msg = make_inbox_message(db, c.id, inv.id, draft_reply="Auto-generated reply")
    db.commit()

    mock_send = mocker.patch("services.gmail_sender.send_reply", return_value=True)

    resp = client.post(f"/inbox/{msg.ticket_id}/send-reply", json={})
    assert resp.status_code == 200
    # Confirm it sent the draft body
    mock_send.assert_called_once()
    _, kwargs = mock_send.call_args
    assert "Auto-generated reply" in (kwargs.get("body") or mock_send.call_args[0][2])


def test_send_reply_no_body_no_draft(client, db, mocker):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    msg = make_inbox_message(db, c.id, inv.id, draft_reply=None)
    db.commit()

    mocker.patch("services.gmail_sender.send_reply", return_value=True)

    resp = client.post(f"/inbox/{msg.ticket_id}/send-reply", json={})
    assert resp.status_code == 400


def test_send_reply_smtp_failure(client, db, mocker):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    msg = make_inbox_message(db, c.id, inv.id)
    db.commit()

    mocker.patch("services.gmail_sender.send_reply", return_value=False)

    resp = client.post(f"/inbox/{msg.ticket_id}/send-reply", json={"body": "Hello"})
    assert resp.status_code == 503


def test_send_reply_ticket_not_found(client):
    resp = client.post("/inbox/TKT-9999/send-reply", json={"body": "Hello"})
    assert resp.status_code == 404


def test_get_thread(client, db):
    c = make_customer(db)
    inv = make_invoice(db, c.id)
    msg = make_inbox_message(db, c.id, inv.id)
    make_scheduled_action(db, inv.id)
    make_scheduled_action(db, inv.id, due_offset=14)
    db.commit()

    resp = client.get(f"/inbox/{msg.ticket_id}/thread")
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert "scheduled_actions" in data
    assert len(data["scheduled_actions"]) == 2
    assert data["message"]["ticket_id"] == msg.ticket_id


def test_get_thread_not_found(client):
    resp = client.get("/inbox/TKT-9999/thread")
    assert resp.status_code == 404


def test_get_thread_no_invoice_returns_empty_actions(client, db):
    # Message with no associated invoice (unrecognised sender)
    msg = make_inbox_message(db, customer_id=None, invoice_id=None)
    db.commit()

    resp = client.get(f"/inbox/{msg.ticket_id}/thread")
    assert resp.status_code == 200
    assert resp.json()["scheduled_actions"] == []
