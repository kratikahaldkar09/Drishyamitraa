from app import app


def test_health():
    client = app.test_client()
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json().get("status") == "ok"


def test_intent_greeting():
    client = app.test_client()
    res = client.post("/api/intent", json={"text": "Hello there"})
    data = res.get_json()
    assert res.status_code == 200
    assert data.get("intent") == "greeting"


def test_detect_faces_stub():
    client = app.test_client()
    res = client.post("/api/detect-faces", json={})
    data = res.get_json()
    assert res.status_code == 200
    assert isinstance(data.get("detected_faces"), list)

