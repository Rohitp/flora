from tests.conftest import make_customer, make_invoice


def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "db_seeded" in data
    assert "customer_count" in data


def test_health_reflects_customer_count(client, db):
    assert client.get("/health").json()["customer_count"] == 0
    make_customer(db)
    db.commit()
    assert client.get("/health").json()["customer_count"] == 1
