# Viora — Secure Real-Time Messaging

A production-style real-time messaging platform inspired by modern privacy-focused messaging applications.

## 🔗 Live Demo
- **Frontend**: [https://viora-secure-messaging.vercel.app](https://viora-secure-messaging.vercel.app)
- **Backend API**: [https://viora-secure-messaging.onrender.com](https://viora-secure-messaging.onrender.com)
- **API Health Check**: [https://viora-secure-messaging.onrender.com/api/health](https://viora-secure-messaging.onrender.com/api/health)
- **GitHub Repository**: [https://github.com/RajatYadav07/viora-secure-messaging](https://github.com/RajatYadav07/viora-secure-messaging)

### Demo Credentials / Testing
- **Register / Login**: You can use any username and phone number.
- **Mock OTP**: Use `123456` to authenticate.
- **Testing Real-Time Messaging**: Open two separate browser windows (or one normal, one incognito) and log in with different accounts (e.g., `alice` and `bob`). You can then add each other as contacts and test real-time chat.

## 📌 Overview
Viora is a full-stack real-time messaging application. Users can register and log in securely, manage contacts, create direct or group conversations, and send messages in real time. The application features live presence tracking, typing indicators, and granular message delivery/read states. Viora utilizes REST APIs for persistent data operations and WebSockets for instantaneous real-time communication. The polished UI is fully responsive across desktop and mobile, and includes a persistent Dark/Light theme toggle.

## ✨ Features
### Authentication
- Mock OTP authentication
- HttpOnly cookie-based sessions
- Login/logout
- Profile management

### Messaging
- 1-to-1 conversations
- Real-time messaging
- Persistent message history
- Sent/delivered/read message states
- Typing indicators
- Online/offline presence
- Last seen tracking

### Groups
- Create groups
- Add/remove members
- Admin/member roles
- Group messaging
- Group message status aggregation

### Contacts
- Add/remove contacts
- Search contacts

### UI/UX
- Responsive desktop and mobile layout
- Dark/Light theme toggle with persistence
- Independent internal chat scrolling
- Independent chat-list scrolling
- Toast notifications
- Unread filters
- Stories placeholder
- Voice/video call placeholders
- Encryption/security UI placeholder

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python |
| **Database** | SQLite, SQLAlchemy |
| **Real-time** | WebSockets |
| **Icons** | Lucide React |
| **Deployment** | Vercel + Render |

## 🏗 Architecture
The application follows a clean client-server architecture separating persistent state and real-time streams:

```
Browser
   ↓
Next.js Frontend
   ↓  (REST API for persistence + WebSocket for real-time events)
FastAPI Backend
   ↓  (SQLAlchemy ORM)
SQLite Database
```
- **REST API**: Handles all persistent operations such as authentication, creating groups, adding contacts, and fetching message history.
- **WebSockets**: Handles real-time instantaneous communication including delivering messages, updating message read/delivery statuses, broadcasting typing indicators, and syncing online presence.

## 📁 Project Structure
```text
signal-clone/
├── frontend/
│   ├── app/            # Next.js App Router pages, layout, and global CSS
│   ├── components/     # Reusable React components (UI, Chat Modals, Message Bubbles)
│   ├── hooks/          # Custom hooks (e.g., useWebSocket)
│   ├── lib/            # API wrappers and generic utilities
│   ├── types/          # TypeScript interfaces for frontend state
│   └── tailwind.config.ts # Tailwind CSS configuration
└── backend/
    ├── app/
    │   ├── models/     # SQLAlchemy ORM models (User, Message, Conversation)
    │   ├── routes/     # FastAPI REST routers (auth, messages, groups, etc.)
    │   ├── schemas/    # Pydantic validation schemas
    │   ├── services/   # Core business logic separated from transport layer
    │   ├── websocket/  # WebSocket connection manager
    │   └── main.py     # Application entrypoint
    └── test_*.py       # Pytest test suites
```

## 🗄 Database Schema

| Entity | Purpose | Important Fields |
|---|---|---|
| **users** | Tracks registered users and presence | `id`, `username`, `phone`, `is_online`, `last_seen` |
| **auth_sessions** | Secure cookie session management | `session_token`, `user_id`, `expires_at` |
| **contacts** | User address book connections | `id`, `user_id`, `contact_user_id` |
| **conversations** | Chat threads (direct or group) | `id`, `type`, `name`, `updated_at` |
| **conversation_members**| Links users to conversations | `conversation_id`, `user_id`, `role` |
| **messages** | Persistent message history | `id`, `conversation_id`, `sender_id`, `content` |
| **message_statuses** | Tracks read/delivery per user | `message_id`, `user_id`, `status` |

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-otp`
- `POST /api/auth/logout`
- `PUT /api/auth/profile`
- `GET /api/auth/me`

### Contacts
- `GET /api/contacts`
- `POST /api/contacts`
- `DELETE /api/contacts/{user_id}`

### Conversations
- `GET /api/conversations`
- `POST /api/conversations/direct`
- `GET /api/conversations/search`

### Groups
- `POST /api/groups`
- `POST /api/groups/{group_id}/members`
- `DELETE /api/groups/{group_id}/members/{user_id}`
- `POST /api/groups/{group_id}/leave`
- `GET /api/groups/{group_id}`

### Messages
- `GET /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/read`

## ⚡ WebSocket
- **Production Connection**: `wss://viora-secure-messaging.onrender.com/ws`
- **Local Connection**: `ws://localhost:8000/ws`
- **Authentication**: Authenticated seamlessly upon connection via the `session_token` HttpOnly cookie.
- **Incoming Events (to Server)**: `message` (send chat), `typing` (broadcast typing state).
- **Outgoing Events (to Client)**: `message` (receive chat), `status_update` (delivered/read receipts), `typing`, `error`.

## 🔐 Security
- **HttpOnly Session Cookie**: Prevents XSS attacks by keeping session tokens inaccessible to JavaScript.
- **Secure Cookie Configuration**: Configured for `Secure` and `SameSite=None` in production to allow cross-origin credential passing.
- **CORS Restrictions**: The backend explicitly allows the Vercel production frontend origin.
- **WebSocket Authentication**: WebSocket connections are validated against active database sessions.
- **Session Expiration**: Enforced server-side expiration times for authenticated sessions.

## 🎨 UI / Responsive Design
- **Responsive Layout**: Designed to adapt seamlessly between desktop monitors, tablets, and mobile viewports.
- **Dark/Light Mode**: Full custom color palettes avoiding simple color inversions for a premium aesthetic.
- **Persistent Theme Selection**: Chosen themes are saved to `localStorage` and injected early to prevent Flash of Unstyled Content (FOUC).
- **Independent Scrolling**: Built with a strict flexbox hierarchy ensuring the message list and chat list scroll independently of the application shell.
- **Mobile Viewport Handling**: Utilizes `100dvh` to prevent mobile browser URL bars from hiding crucial bottom input fields.

## 🚀 Local Setup

### 1. Clone Repository
```bash
git clone https://github.com/RajatYadav07/viora-secure-messaging.git
cd viora-secure-messaging
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Environment Variables
No `.env` is strictly required for local development, as safe defaults are provided.

### 5. Run Both Services
**Run Backend:**
```bash
cd backend
# With virtual environment activated:
uvicorn app.main:app --reload --port 8000
```

**Run Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## 🌐 Environment Variables

### Frontend (`frontend/.env.local` / Vercel Settings)
- `NEXT_PUBLIC_API_URL`: Points to the backend URL.
  - *Local*: `http://localhost:8000`
  - *Production*: `https://viora-secure-messaging.onrender.com`

### Backend (`backend/.env` / Render Settings)
- `ENVIRONMENT`: Set to `production` in deployed environments.
- `CORS_ORIGINS`: Allowed origins (e.g., `https://viora-secure-messaging.vercel.app`).
- `DATABASE_URL`: Connection string. Defaults to `sqlite:///./signal.db`.

## 🧪 Testing Checklist
- [ ] Registration with mock OTP
- [ ] Login and logout
- [ ] Contact creation and removal
- [ ] Direct messaging (1-on-1)
- [ ] Real-time message delivery across browser windows
- [ ] Typing indicators trigger and hide appropriately
- [ ] Real-time online/offline presence tracking
- [ ] Read receipts (Single tick → Double tick → Blue double tick)
- [ ] Group creation and member management
- [ ] Group messaging broadcast
- [ ] Dark/light theme toggle and persistence
- [ ] Desktop responsive layout constraints
- [ ] Mobile responsive layout constraints and viewport handling
- [ ] Chat-list internal scrolling
- [ ] Message-list internal scrolling

## ☁️ Deployment
- **Frontend (Vercel)**: Vercel automatically builds and deploys the Next.js application directly from the configured Git `master` branch.
  - *URL*: [https://viora-secure-messaging.vercel.app](https://viora-secure-messaging.vercel.app)
- **Backend (Render)**: Render runs the FastAPI application using Uvicorn.
  - *URL*: [https://viora-secure-messaging.onrender.com](https://viora-secure-messaging.onrender.com)
  - *Configuration*: The production backend specifies `CORS_ORIGINS` to safely accept connections from the Vercel frontend, and routes WebSockets through secure `wss://`.

*(Note: SQLite is currently used for ease of setup. For a true production deployment requiring durable, multi-instance persistent storage on Render, PostgreSQL should be used.)*

## ⚠️ Limitations
- **Mocked Encryption**: End-to-end encryption is mocked for the scope of this assignment/demo. Messages are currently stored in plaintext.
- **Persistence**: SQLite is used currently, which is not suitable for ephemeral filesystems on serverless or containerized hosts. It should be replaced with PostgreSQL for true durability.
- **Placeholders**: Voice/video calls, stories, media attachments, and reactions are frontend UI placeholders and are not fully implemented on the backend.

## 🔮 Future Improvements
- Migration to PostgreSQL for robust persistence.
- Implementation of the real Signal Protocol for genuine End-to-End Encryption (E2EE).
- Media and file upload handling via AWS S3 or equivalent.
- Message reactions and disappearing messages.
- Push notifications for offline mobile users.
- WebRTC integration for production-grade voice and video calls.
- Advanced pagination and infinite scrolling optimizations.
- API rate limiting and DDoS protection.
- Real SMS/Email verification for authentication.

## 👨💻 Author
- **GitHub**: [https://github.com/RajatYadav07](https://github.com/RajatYadav07)
- **Project Repository**: [https://github.com/RajatYadav07/viora-secure-messaging](https://github.com/RajatYadav07/viora-secure-messaging)
- **Live Demo**: [https://viora-secure-messaging.vercel.app](https://viora-secure-messaging.vercel.app)

## 📄 License
This project was developed as a software engineering assignment/project.
