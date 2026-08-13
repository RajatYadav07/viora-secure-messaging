# Signal Clone — Secure Messaging Platform

An original implementation inspired by Signal's UX and core features, built for production quality with clean modular architecture. 

This project implements a fully functional, real-time messaging platform with direct chats, group messaging, delivery/read receipts, presence tracking, and a polished user interface.

## 1. Project Overview
This platform allows users to register, log in, manage contacts, and engage in real-time messaging via WebSockets. It is modeled after the Signal desktop application, focusing on robust backend persistence, secure session management, and responsive frontend design.

## 2. Features
- **Authentication**: Mocked OTP registration & login, secure HttpOnly cookie session management.
- **Contacts**: Add/remove contacts by username, search contacts.
- **Direct Messaging**: 1-on-1 real-time chat with message history persistence.
- **Group Messaging**: Create groups, add/remove members, admin roles, and real-time group broadcasting.
- **Message Status**: Real-time tracking of sent, delivered, and read statuses, including aggregate status for groups.
- **Typing Indicators**: Ephemeral typing indicators broadcasted over WebSockets.
- **Presence**: Real-time online/offline status and "last seen" tracking.
- **Profile Management**: Update display name and avatar.
- **UI & Placeholders**: Signal-style settings modal, mock encryption shield, toast notifications, voice/video call placeholders, stories placeholders, and unread conversation filters.

## 3. Tech Stack
### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.10+
- **ORM**: SQLAlchemy
- **Database**: SQLite
- **Real-time**: WebSockets

## 4. Architecture
The application follows a standard client-server architecture:
- **Client**: Next.js React application handling UI, state management, and WebSocket connections.
- **Server**: FastAPI REST API handling business logic, database persistence, and WebSocket broadcasting.
- **Database**: SQLite relational database tracking users, conversations, messages, and statuses.

## 5. Folder Structure
```
signal-clone/
├── frontend/
│   ├── app/            # Next.js App Router pages and layout
│   ├── components/     # Reusable React components (UI, Chat)
│   ├── hooks/          # Custom hooks (e.g., useWebSocket)
│   ├── lib/            # API wrappers and utilities
│   ├── types/          # TypeScript interfaces
│   └── ...config files
└── backend/
    ├── app/
    │   ├── models/     # SQLAlchemy ORM models
    │   ├── routes/     # FastAPI routers (auth, messages, etc.)
    │   ├── schemas/    # Pydantic validation schemas
    │   ├── services/   # Core business logic
    │   ├── websocket/  # WebSocket connection manager
    │   ├── database.py # DB initialization
    │   └── main.py     # Application entrypoint
    ├── test_*.py       # Pytest test suites
    └── ...config files
```

## 6. Database Schema
- **users**: id, username, phone, display_name, avatar, is_online, last_seen, created_at.
- **auth_sessions**: session_token, user_id, created_at, expires_at.
- **contacts**: id, user_id, contact_user_id, created_at.
- **conversations**: id, type (direct/group), name, created_at, updated_at.
- **conversation_members**: id, conversation_id, user_id, role (admin/member), joined_at.
- **messages**: id, conversation_id, sender_id, content, created_at.
- **message_statuses**: id, message_id, user_id, status (sent/delivered/read), updated_at.

## 7. API Overview
All endpoints reside under `/api`:
- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/logout`, `PUT /auth/profile`, `GET /auth/me`
- **Contacts**: `GET /contacts`, `POST /contacts`, `DELETE /contacts/{user_id}`
- **Conversations**: `GET /conversations`, `POST /conversations/direct`, `GET /conversations/search`
- **Groups**: `POST /groups`, `POST /groups/{group_id}/members`, `DELETE /groups/{group_id}/members/{user_id}`, `POST /groups/{group_id}/leave`, `GET /groups/{group_id}`
- **Messages**: `GET /conversations/{id}/messages`, `POST /conversations/{id}/read`

## 8. WebSocket Overview
Connections are established at `ws://<host>/ws`.
- **Authentication**: Validated securely using the `session_token` HttpOnly cookie.
- **Incoming Events (from client)**: `message`, `typing`.
- **Outgoing Events (from server)**: `message`, `status_update`, `presence`, `typing`, `error`.
- **Presence**: Connect/Disconnect lifecycle hooks update user online/offline status in DB and broadcast to relevant peers.

## 9. Local Setup
### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) & pip

## 10. Environment Variables
No `.env` is strictly required for local development (defaults are provided), but you can configure:

**Backend (`backend/.env`)**
```env
DATABASE_URL=sqlite:///./signal.db
# (Optional) Add CORS overrides if running frontend on a custom port
```

**Frontend (`frontend/.env.local`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 11. How to run frontend
```bash
cd frontend
npm install
npm run dev
# The application will run at: http://localhost:3000
```

## 12. How to run backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# The server will run at: http://localhost:8000
```

## 13. Seed / Demo Credentials
To quickly test the application, open two separate browser windows (or one normal, one incognito):
1. **Window 1**: Register/Login as `alice`.
2. **Window 2**: Register/Login as `bob`.
*Note: The mock OTP code for all authentications is `123456`.*

## 14. Mocked Encryption Disclaimer
**Important:** This assignment simulates end-to-end encryption for demonstration purposes. Messages are currently stored in plain text in the SQLite database to facilitate assignment grading and review. Real cryptographic protocols (like the Signal Protocol) are not implemented.

## 15. Deployment Notes
When deploying to production environments (e.g., Vercel for frontend, Render/Railway for backend):
1. **Database**: Migrate from SQLite to PostgreSQL by updating `DATABASE_URL` and ensuring `psycopg2-binary` is installed.
2. **CORS**: Ensure the backend's CORS origins allow the deployed frontend URL.
3. **Environment Vars**: Set `NEXT_PUBLIC_API_URL` on the frontend to the deployed backend URL (e.g., `https://api.myapp.com`).
4. **WebSockets**: Ensure the hosting provider supports long-lived WebSocket connections.

## 16. Known Limitations
- Media attachments, message reactions, and disappearing messages are not implemented.
- Voice, video calls, and stories are frontend placeholders only.
- Encryption is mocked for assignment scope.
- Pagination is implemented for message fetching, but advanced infinite scrolling UI optimizations may require further extension.
