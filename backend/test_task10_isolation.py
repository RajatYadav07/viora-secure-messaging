from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
import time

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    Base.metadata.drop_all(bind=engine)

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _create_user(username: str, display_name: str) -> dict:
    client.post("/api/auth/register", json={
        "username": username,
        "display_name": display_name
    })
    resp = client.post("/api/auth/verify-otp", json={
        "username": username,
        "otp": "123456"
    })
    return resp.json()

def test_data_isolation():
    # Setup users
    alpha_client = TestClient(app)
    beta_client = TestClient(app)

    alpha_client.post("/api/auth/register", json={"username": "alpha1", "display_name": "Alpha"})
    alpha_resp = alpha_client.post("/api/auth/verify-otp", json={"username": "alpha1", "otp": "123456"})
    alpha_id = alpha_resp.json()["id"]

    beta_client.post("/api/auth/register", json={"username": "beta1", "display_name": "Beta"})
    beta_resp = beta_client.post("/api/auth/verify-otp", json={"username": "beta1", "otp": "123456"})
    beta_id = beta_resp.json()["id"]

    # 1. Create Alpha-Beta DM
    dm_resp = alpha_client.post("/api/conversations/direct", json={"user_id": beta_id})
    assert dm_resp.status_code == 200
    dm_id = dm_resp.json()["id"]

    # Send message "DM MESSAGE" (needs WebSocket or bypass via DB, wait, we don't have REST endpoint for sending messages)
    # The assignment says "Send message". Wait, sending a message is only done via WebSocket!
    # Let's connect via WebSocket.
    with alpha_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "type": "message",
            "conversation_id": dm_id,
            "content": "DM MESSAGE"
        })
        # Wait a bit for processing
        time.sleep(0.5)

    # 2. Beta creates Valorant group containing Alpha and Beta
    group_resp = beta_client.post("/api/groups", json={
        "name": "Valorant",
        "member_ids": [alpha_id, beta_id]
    })
    assert group_resp.status_code in [200, 201], group_resp.text
    group_id = group_resp.json()["id"]

    assert dm_id != group_id

    # 3. GET Valorant messages => []
    group_msgs_resp = alpha_client.get(f"/api/conversations/{group_id}/messages")
    assert group_msgs_resp.status_code == 200
    group_msgs = group_msgs_resp.json()
    assert len(group_msgs) == 0, f"Expected 0 messages, got {group_msgs}"

    # 4. Send "GROUP MESSAGE" inside Valorant
    with beta_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "type": "message",
            "conversation_id": group_id,
            "content": "GROUP MESSAGE"
        })
        time.sleep(0.5)

    # 5. GET Valorant messages => only "GROUP MESSAGE"
    group_msgs_resp = beta_client.get(f"/api/conversations/{group_id}/messages")
    group_msgs = group_msgs_resp.json()
    assert len(group_msgs) == 1
    assert group_msgs[0]["content"] == "GROUP MESSAGE"
    assert group_msgs[0]["conversation_id"] == group_id

    # 6. GET Alpha-Beta DM messages => only "DM MESSAGE", not "GROUP MESSAGE"
    dm_msgs_resp = alpha_client.get(f"/api/conversations/{dm_id}/messages")
    dm_msgs = dm_msgs_resp.json()
    assert len(dm_msgs) >= 1
    assert all(msg["conversation_id"] == dm_id for msg in dm_msgs)
    assert not any(msg["content"] == "GROUP MESSAGE" for msg in dm_msgs)

    print("ALL ISOLATION TESTS PASSED")

if __name__ == "__main__":
    test_data_isolation()
