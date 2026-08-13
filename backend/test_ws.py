import asyncio
import websockets
import json
import requests

async def test_ws():
    # Login
    session = requests.Session()
    session.post("http://localhost:8000/api/auth/login", json={"username": "alice"})
    session.post("http://localhost:8000/api/auth/verify-otp", json={"username": "alice", "otp": "123456"})
    
    # Get cookie
    cookies = session.cookies.get_dict()
    cookie_str = "; ".join([f"{k}={v}" for k, v in cookies.items()])
    
    # Connect WS
    async with websockets.connect(
        "ws://localhost:8000/ws",
        extra_headers={"Cookie": cookie_str}
    ) as ws:
        # Send message
        payload = {
            "type": "message",
            "conversation_id": 1,
            "content": "hello test 123"
        }
        await ws.send(json.dumps(payload))
        
        # Receive response
        response = await ws.recv()
        print("Received:", response)

asyncio.run(test_ws())
