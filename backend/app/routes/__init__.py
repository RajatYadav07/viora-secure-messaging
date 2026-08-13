from app.routes.auth import router as auth_router
from app.routes.contacts import router as contacts_router
from app.routes.conversations import router as conversations_router
from app.routes.health import router as health_router
from app.routes.messages import router as messages_router

__all__ = ["health_router", "auth_router", "contacts_router", "conversations_router", "messages_router"]
