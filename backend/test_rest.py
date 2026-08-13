import requests

session = requests.Session()
login_res = session.post("http://localhost:8000/api/auth/login", json={"username": "alice"})
verify_res = session.post("http://localhost:8000/api/auth/verify-otp", json={"username": "alice", "otp": "123456"})
print("Verify:", verify_res.json())

convs = session.get("http://localhost:8000/api/conversations").json()
if isinstance(convs, list) and convs:
    print("Latest conversation ID:", convs[0]['id'])
    print("Latest message preview:", convs[0].get('latest_message'))

    msgs = session.get(f"http://localhost:8000/api/conversations/{convs[0]['id']}/messages").json()
    print("First few messages:")
    for msg in msgs[:3]:
        print(f"ID: {msg['id']}, Content: '{msg['content']}'")
else:
    print("No convs or error:", convs)
