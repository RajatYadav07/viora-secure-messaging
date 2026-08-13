import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import auth, contacts, conversations, health, messages, groups
from app.services.presence_service import broadcast_presence
from app.database import Base, engine, SessionLocal
from fastapi import WebSocket, WebSocketDisconnect
import json
from app.services.auth_service import COOKIE_NAME, utc_now
from app.models.session import AuthSession
from app.models.user import User
from app.models.conversation import ConversationMember
from app.websocket.manager import manager
from app.services.message_service import create_message, deliver_message_to_user
from app.schemas.message import MessageResponse

# Import all models so their tables are registered in Base.metadata
# before create_all() is called below.
import app.models  # noqa: F401

load_dotenv()

app = FastAPI(
    title="Signal Clone API",
    description="Backend API for Secure Messaging Platform (Signal Clone)",
    version="0.1.0",
)

# Configure CORS for Next.js Frontend
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(groups.router, prefix="/api")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    session_token = websocket.cookies.get(COOKIE_NAME)
    if not session_token:
        await websocket.close(code=4001)
        return
        
    db = SessionLocal()
    try:
        auth_session = db.query(AuthSession).filter(AuthSession.session_token == session_token).first()
        if not auth_session:
            await websocket.close(code=4001)
            return
            
        expires_at = auth_session.expires_at
        if expires_at.tzinfo is None:
            from datetime import timezone
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < utc_now():
            await websocket.close(code=4001)
            return
            
        user = db.query(User).filter(User.id == auth_session.user_id).first()
        if not user:
            await websocket.close(code=4001)
            return
            
        is_first_conn = await manager.connect(user.id, websocket)
        if is_first_conn:
            await broadcast_presence(db, user, is_online=True)
            
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    await websocket.send_text(json.dumps({"type": "error", "code": "INVALID_JSON", "message": "Invalid JSON format"}))
                    continue
                    
                msg_type = payload.get("type")

                if msg_type == "message":
                    conversation_id = payload.get("conversation_id")
                    content = payload.get("content")
                    reply_to_id = payload.get("reply_to_id")
                    
                    if not conversation_id or not content:
                        await websocket.send_text(json.dumps({"type": "error", "code": "MISSING_FIELD", "message": "Missing conversation_id or content"}))
                        continue
                        
                    try:
                        msg, agg_status = create_message(
                            db=db,
                            sender=user,
                            conversation_id=conversation_id,
                            content=content,
                            reply_to_id=reply_to_id
                        )
                    except ValueError as e:
                        err_msg = str(e)
                        code = "SERVER_ERROR"
                        if err_msg == "Message content cannot be empty":
                            code = "EMPTY_MESSAGE"
                        elif err_msg == "Conversation not found":
                            code = "CONVERSATION_NOT_FOUND"
                        elif err_msg == "Not a member of this conversation":
                            code = "NOT_CONVERSATION_MEMBER"
                            
                        await websocket.send_text(json.dumps({"type": "error", "code": code, "message": err_msg}))
                        continue
                    except Exception as e:
                        db.rollback()
                        await websocket.send_text(json.dumps({"type": "error", "code": "SERVER_ERROR", "message": "Internal server error"}))
                        continue
                        
                    msg_resp = MessageResponse.model_validate(msg)
                    msg_resp.status = agg_status
                    msg_dict = msg_resp.model_dump(mode="json")
                    
                    event = {
                        "type": "message",
                        "message": msg_dict
                    }
                    
                    members = db.query(ConversationMember).filter(ConversationMember.conversation_id == conversation_id).all()
                    
                    # Track which recipients are connected for auto-delivery
                    connected_recipient_ids = []
                    
                    for member in members:
                        await manager.send_to_user(member.user_id, event)
                        # If recipient is connected and not the sender, mark delivered
                        if member.user_id != user.id and member.user_id in manager.active_connections:
                            connected_recipient_ids.append(member.user_id)

                    # Auto-deliver to connected recipients
                    if connected_recipient_ids:
                        for recipient_id in connected_recipient_ids:
                            deliver_message_to_user(db, msg.id, recipient_id)

                        # Notify sender that message was delivered
                        await manager.send_to_user(user.id, {
                            "type": "status_update",
                            "message_id": msg.id,
                            "status": "delivered",
                        })

                elif msg_type == "typing":
                    # Typing indicators — ephemeral, no DB writes
                    conversation_id = payload.get("conversation_id")
                    is_typing = payload.get("is_typing", False)

                    if not conversation_id:
                        await websocket.send_text(json.dumps({"type": "error", "code": "MISSING_FIELD", "message": "Missing conversation_id"}))
                        continue

                    # Verify sender is a member
                    is_member = db.query(ConversationMember).filter(
                        ConversationMember.conversation_id == conversation_id,
                        ConversationMember.user_id == user.id,
                    ).first()
                    if not is_member:
                        await websocket.send_text(json.dumps({"type": "error", "code": "NOT_CONVERSATION_MEMBER", "message": "Not a member of this conversation"}))
                        continue

                    # Broadcast typing event to all OTHER members
                    members = db.query(ConversationMember).filter(
                        ConversationMember.conversation_id == conversation_id,
                        ConversationMember.user_id != user.id,
                    ).all()

                    typing_event = {
                        "type": "typing",
                        "conversation_id": conversation_id,
                        "user_id": user.id,
                        "is_typing": is_typing,
                    }

                    for member in members:
                        await manager.send_to_user(member.user_id, typing_event)

                else:
                    await websocket.send_text(json.dumps({"type": "error", "code": "UNSUPPORTED_TYPE", "message": "Unsupported message type"}))
                    
        except WebSocketDisconnect:
            is_last_conn = manager.disconnect(user.id, websocket)
            if is_last_conn:
                await broadcast_presence(db, user, is_online=False)
            
    finally:
        db.close()


@app.on_event("startup")
def create_tables() -> None:
    """
    Create all SQLAlchemy-mapped tables in SQLite on startup.

    This is the simple, migration-free approach for development.
    Alembic will replace this when we move toward production (Task N+1).
    """
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Signal Clone API is operational. Access health status at /api/health"}
