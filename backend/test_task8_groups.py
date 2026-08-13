"""
Test script for Task 8: Complete Group Messaging
"""
import sys
import os
sys.path.insert(0, ".")

os.environ["DATABASE_URL"] = "sqlite:///./test_task8.db"

from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def reg(username, display_name):
    client.post("/api/auth/register", json={"username": username, "display_name": display_name})
    r = client.post("/api/auth/verify-otp", json={"username": username, "otp": "123456"})
    return r.json(), r.cookies

print("=" * 60)
print("TASK 8 BACKEND TESTS")
print("=" * 60)

# Register users
alice, alice_c = reg("alice", "Alice")
bob, bob_c = reg("bob", "Bob")
charlie, charlie_c = reg("charlie", "Charlie")
dave, dave_c = reg("dave", "Dave")
eve, eve_c = reg("eve", "Eve")

print("[1] Create Group")
r = client.post("/api/groups", json={"name": "Test Group", "member_ids": [bob["id"], charlie["id"]]}, cookies=alice_c)
assert r.status_code == 201, f"Failed: {r.text}"
group = r.json()
group_id = group["id"]
print("    PASS")

print("[2] Creator becomes admin")
r = client.get(f"/api/groups/{group_id}", cookies=alice_c)
assert r.status_code == 200
detail = r.json()
alice_member = next(m for m in detail["members"] if m["user_id"] == alice["id"])
assert alice_member["role"] == "admin"
print("    PASS")

print("[3] Members are added correctly")
assert len(detail["members"]) == 3
bob_member = next(m for m in detail["members"] if m["user_id"] == bob["id"])
assert bob_member["role"] == "member"
print("    PASS")

print("[4] Non-admin cannot add members")
r = client.post(f"/api/groups/{group_id}/members", json={"user_id": dave["id"]}, cookies=bob_c)
assert r.status_code == 403, f"Expected 403, got {r.status_code}"
print("    PASS")

print("[5] Admin can add member")
r = client.post(f"/api/groups/{group_id}/members", json={"user_id": dave["id"]}, cookies=alice_c)
assert r.status_code == 200
r = client.get(f"/api/groups/{group_id}", cookies=alice_c)
assert len(r.json()["members"]) == 4
print("    PASS")

print("[6] Admin can remove member")
r = client.delete(f"/api/groups/{group_id}/members/{charlie['id']}", cookies=alice_c)
assert r.status_code == 200
r = client.get(f"/api/groups/{group_id}", cookies=alice_c)
assert len(r.json()["members"]) == 3
print("    PASS")

print("[7] Cannot remove last admin")
r = client.delete(f"/api/groups/{group_id}/members/{alice['id']}", cookies=alice_c)
assert r.status_code == 400
print("    PASS")

print("[8] Non-member cannot access group details")
r = client.get(f"/api/groups/{group_id}", cookies=eve_c)
assert r.status_code == 403
print("    PASS")

print("[9] Group message persists & reaches members")
from app.database import SessionLocal
from app.services.message_service import create_message
from app.models.user import User

db = SessionLocal()
alice_user = db.query(User).filter(User.id == alice["id"]).first()

# Bob sends a message
bob_user = db.query(User).filter(User.id == bob["id"]).first()
msg, agg = create_message(db, bob_user, group_id, "Hello from bob")
assert msg.id is not None
assert agg == "sent"
print("    PASS")

print("[10] Group messages have correct message status records")
# Alice and Dave should have statuses, Bob should not
from app.models.message import MessageStatus
statuses = db.query(MessageStatus).filter(MessageStatus.message_id == msg.id).all()
user_ids = {s.user_id for s in statuses}
assert user_ids == {alice["id"], dave["id"]}
assert bob["id"] not in user_ids
print("    PASS")

print("[11] Non-member cannot send to group")
try:
    eve_user = db.query(User).filter(User.id == eve["id"]).first()
    create_message(db, eve_user, group_id, "Hacked")
    assert False, "Should have thrown ValueError"
except ValueError as e:
    assert str(e) == "Not a member of this conversation"
    print("    PASS")

print("[12] Direct messaging still works")
r = client.post("/api/conversations/direct", json={"user_id": bob["id"]}, cookies=alice_c)
assert r.status_code == 200
conv_id = r.json()["id"]
msg2, agg2 = create_message(db, alice_user, conv_id, "Hello direct")
assert agg2 == "sent"
print("    PASS")

print("[13] Leave group / transfer admin / prevent leave")
# Promote Bob to admin
from app.models.conversation import ConversationMember
bob_mem = db.query(ConversationMember).filter(ConversationMember.conversation_id == group_id, ConversationMember.user_id == bob["id"]).first()
bob_mem.role = "admin"
db.commit()

# Alice leaves (allowed because Bob is admin)
r = client.post(f"/api/groups/{group_id}/leave", cookies=alice_c)
assert r.status_code == 200
r = client.get(f"/api/groups/{group_id}", cookies=bob_c)
assert len(r.json()["members"]) == 2  # Bob and Dave
print("    PASS (Alice left, Bob is admin)")

# Bob tries to leave (not allowed, last admin)
r = client.post(f"/api/groups/{group_id}/leave", cookies=bob_c)
assert r.status_code == 400, f"Expected 400, got {r.status_code}"
print("    PASS (Bob cannot leave as last admin)")


print("=" * 60)
print("ALL BACKEND TESTS PASSED ✓")
print("=" * 60)

db.close()
try:
    os.remove("test_task8.db")
except:
    pass
