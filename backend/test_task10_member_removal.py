from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message

def test_member_removal_isolation():
    alpha_client = TestClient(app)
    beta_client = TestClient(app)

    # Setup Alpha
    alpha_client.post("/api/auth/register", json={"username": "alpha2", "display_name": "Alpha"})
    alpha_resp = alpha_client.post("/api/auth/verify-otp", json={"username": "alpha2", "otp": "123456"})
    alpha_id = alpha_resp.json()["id"]

    # Setup Beta
    beta_client.post("/api/auth/register", json={"username": "beta2", "display_name": "Beta"})
    beta_resp = beta_client.post("/api/auth/verify-otp", json={"username": "beta2", "otp": "123456"})
    beta_id = beta_resp.json()["id"]

    # Beta creates Valorant
    group_resp = beta_client.post("/api/groups", json={"name": "Valorant", "member_ids": [alpha_id, beta_id]})
    assert group_resp.status_code in [200, 201], group_resp.text
    group_id = group_resp.json()["id"]

    import time
    with beta_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "type": "message",
            "conversation_id": group_id,
            "content": "TEST MESSAGE"
        })
        time.sleep(0.5)

    # Beta removes Alpha
    remove_resp = beta_client.delete(f"/api/groups/{group_id}/members/{alpha_id}")
    assert remove_resp.status_code == 200, remove_resp.text

    # Verify Beta still sees Valorant in conversation list (Test 8)
    beta_convs_resp = beta_client.get("/api/conversations")
    assert beta_convs_resp.status_code == 200
    beta_convs = beta_convs_resp.json()
    assert any(c["id"] == group_id for c in beta_convs), "Group disappeared from Beta's conversation list!"

    # Verify Alpha does NOT see Valorant (Test 9)
    alpha_convs_resp = alpha_client.get("/api/conversations")
    alpha_convs = alpha_convs_resp.json()
    assert not any(c["id"] == group_id for c in alpha_convs), "Group still in Alpha's list!"

    # Verify Beta can still GET group details (Test 4)
    beta_group_resp = beta_client.get(f"/api/groups/{group_id}")
    assert beta_group_resp.status_code == 200, beta_group_resp.text
    
    # Verify Alpha gets 403 when trying to GET group details (Test 5)
    alpha_group_resp = alpha_client.get(f"/api/groups/{group_id}")
    assert alpha_group_resp.status_code == 403, alpha_group_resp.text

    # Verify Beta can still send a group message after removing Alpha (Test 6)
    with beta_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "type": "message",
            "conversation_id": group_id,
            "content": "TEST MESSAGE 2"
        })
        time.sleep(0.5)

    # Verify existing group messages remain after removing Alpha (Test 7)
    msgs_resp = beta_client.get(f"/api/conversations/{group_id}/messages")
    assert msgs_resp.status_code == 200
    msgs = msgs_resp.json()
    assert len(msgs) == 2, f"Expected 2 messages, got {len(msgs)}"
    # Messages are returned oldest first.
    assert msgs[1]["content"] == "TEST MESSAGE 2"
    assert msgs[0]["content"] == "TEST MESSAGE"

    print("ALL TESTS PASSED")

if __name__ == "__main__":
    test_member_removal_isolation()
