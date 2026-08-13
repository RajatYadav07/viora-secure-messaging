# Import all models here so that SQLAlchemy's Base.metadata is fully
# populated before create_all() is called in main.py.
#
# The import order matters for foreign-key resolution:
#   1. User         — referenced by almost every other table
#   2. Contact      — references User
#   3. Conversation — references User (created_by)
#   4. ConversationMember — references Conversation + User
#   5. Message      — references Conversation + User + self (reply_to_id)
#   6. MessageStatus — references Message + User
#   7. AuthSession  — references User

from app.models.user import User  # noqa: F401
from app.models.contact import Contact  # noqa: F401
from app.models.conversation import Conversation, ConversationMember  # noqa: F401
from app.models.message import Message, MessageStatus  # noqa: F401
from app.models.session import AuthSession  # noqa: F401

__all__ = [
    "User",
    "Contact",
    "Conversation",
    "ConversationMember",
    "Message",
    "MessageStatus",
    "AuthSession",
]
