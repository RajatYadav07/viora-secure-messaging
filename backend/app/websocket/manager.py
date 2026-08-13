from typing import Dict, Set
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> set of active WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> bool:
        await websocket.accept()
        is_first = False
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
            is_first = True
        self.active_connections[user_id].add(websocket)
        return is_first

    def disconnect(self, user_id: int, websocket: WebSocket) -> bool:
        is_last = False
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                is_last = True
        return is_last

    async def send_to_user(self, user_id: int, data: dict):
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(data))
                except Exception:
                    disconnected.add(connection)
            
            for conn in disconnected:
                self.disconnect(user_id, conn)

    def get_active_user_ids(self) -> Set[int]:
        return set(self.active_connections.keys())

manager = ConnectionManager()
