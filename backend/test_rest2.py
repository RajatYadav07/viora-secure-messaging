import requests

session = requests.Session()
login_res = session.post("http://localhost:8000/api/auth/login", json={"username": "alice"})
verify_res = session.post("http://localhost:8000/api/auth/verify-otp", json={"username": "alice", "otp": "123456"})

convs = session.get("http://localhost:8000/api/conversations").json()
for conv in convs:
    print(f"Conversation {conv['id']} ({conv.get('name') or 'Direct'}): Latest msg: {conv.get('latest_message')}")
