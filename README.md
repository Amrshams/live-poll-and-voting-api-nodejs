# Real-Time Live Poll & Voting API

A production-structured Node.js and Express 5 RESTful API with real-time WebSocket (`ws`) live vote broadcasting, JWT stateless authentication, role-based creator permissions, and local JSON file persistence (`fs/promises`).

---

## Features

- **Stateless JWT Authentication:** Secure registration and login using Node's native `crypto` salted password hashing (`scryptSync` / `pbkdf2Sync`) and `jsonwebtoken`.
- **Role-Based Access Control (RBAC):** Authenticated users can create polls and cast votes, while only the original poll creator (`creatorId === req.user.id`) can delete their poll (`403 Forbidden` enforcement).
- **Single-Vote Integrity:** Tracks voter IDs per poll to prevent duplicate voting (`409 Conflict`).
- **Real-Time Live Updates (`ws`):** Attaches a WebSocket server directly to the HTTP server on the same port and pushes instant `VOTE_UPDATE` JSON events to all open clients (`WebSocket.OPEN`) whenever a vote is recorded.
- **Hardened Middleware Pipeline:** Secures HTTP response headers with `helmet()`, configures Cross-Origin Resource Sharing via `cors()`, parses JSON payloads with `express.json()`, and handles `404` and centralized 4-argument `(err, req, res, next)` error responses.
- **Operational Readiness:** Includes a `/health` readiness endpoint and graceful shutdown listeners for `SIGINT` and `SIGTERM`.

---

## Project Architecture

```text
live-poll-api/
├── data/
│   ├── users.json             # Persisted user accounts (salted password hashes)
│   └── polls.json             # Persisted polls, option vote counts, and voter IDs
├── src/
│   ├── middleware/
│   │   ├── auth.js            # verifyToken JWT Bearer guard (attaches req.user)
│   │   └── errorHandler.js    # Centralized 4-parameter Express error handler
│   ├── routes/
│   │   ├── auth.routes.js     # POST /register & POST /login
│   │   └── polls.routes.js    # GET /, POST /, DELETE /:id, POST /:id/vote
│   ├── utils/
│   │   ├── crypto.js          # Native crypto password hashing & verification
│   │   └── storage.js         # Async fs/promises JSON read/write helpers
│   ├── ws/
│   │   └── socket.js          # WebSocket server setup & broadcastPollUpdate()
│   └── server.js              # Entry point, middleware stack, /health, shutdown
├── .env                       # Environment configuration (ignored by Git)
├── .gitignore                 # Excludes node_modules/, .env, and data/*.json
└── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js** v20+ (LTS recommended)
- **npm** v10+

### 1. Installation
```bash
git clone <your-repo-url>
cd real-time-live-poll-and-voting-api
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
JWT_SECRET=replace_with_a_long_random_secret_string
```

### 3. Running the Server
- **Development mode (auto-reloads on file changes):**
  ```bash
  npm run dev
  ```
- **Production mode:**
  ```bash
  npm start
  ```

---

## API Reference

### Operational Endpoints

| Method | Endpoint | Auth | Description | Success Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Returns server health (`200 OK`) or `503 Service Unavailable` during graceful shutdown. | `200 OK` |

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Auth | Request Body | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | `{ "username": "alice", "password": "Password123!" }` | Registers a new user with a salted hash. | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | Public | `{ "username": "alice", "password": "Password123!" }` | Verifies credentials and issues a signed JWT. | `200`, `400`, `401` |

### Poll & Voting Endpoints (`/api/polls`)

| Method | Endpoint | Auth | Request Body / Query | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/polls` | Public | Query: `?status=open` or `?status=closed` | Lists all polls, optionally filtered by status. | `200` |
| `POST` | `/api/polls` | Bearer JWT | `{ "question": "...", "options": ["A", "B"] }` | Creates a new poll owned by `req.user.id`. | `201`, `400`, `401` |
| `DELETE` | `/api/polls/:id` | Bearer JWT | *None* | Deletes a poll (creator only). | `200`, `401`, `403`, `404` |
| `POST` | `/api/polls/:id/vote` | Bearer JWT | `{ "optionId": "<option-uuid>" }` | Casts a single vote and triggers a WebSocket broadcast. | `200`, `400`, `401`, `404`, `409` |

---

## WebSocket Real-Time Events

Connect any WebSocket client to the same host and port as the HTTP server:
- **URL:** `ws://localhost:3000`
- **Handshake:** Upgrades via HTTP `101 Switching Protocols`.

### Server-to-Client Broadcast Payload (`VOTE_UPDATE`)
Whenever a valid vote is recorded via `POST /api/polls/:id/vote`, the server broadcasts the following JSON payload to all open connections (`client.readyState === WebSocket.OPEN`):

```json
{
  "event": "VOTE_UPDATE",
  "poll": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "Best Node.js framework?",
    "creatorId": "user-uuid-of-alice",
    "status": "open",
    "options": [
      { "id": "opt-uuid-1", "text": "Express", "votes": 2 },
      { "id": "opt-uuid-2", "text": "Fastify", "votes": 0 }
    ],
    "voters": ["user-uuid-of-bob", "user-uuid-of-alice"],
    "createdAt": "2026-11-25T10:00:00.000Z"
  }
}
```

---

## End-to-End Testing Guide (Postman / Insomnia)

Follow these verification steps in sequence to validate every security rule, status code, and real-time event:

### 1. Security Headers & Health Check
- **Request:** `GET http://localhost:3000/health`
- **Expected:** `200 OK`. Verify in response headers that `X-Powered-By` is absent and `X-Frame-Options` is set by `helmet()`.

### 2. User Registration & Duplicate Prevention
- **Request 1:** `POST http://localhost:3000/api/auth/register` with `{"username": "alice", "password": "Password123!"}` -> **`201 Created`** (verify `data/users.json` stores a hash, never plaintext).
- **Request 2:** Repeat the exact same request for `"alice"` -> **`409 Conflict`**.
- **Request 3:** Register a second user `"bob"` -> **`201 Created`**.

### 3. Authentication & Token Issuance
- **Request 1:** `POST http://localhost:3000/api/auth/login` with wrong password -> **`401 Unauthorized`**.
- **Request 2:** Login as `"alice"` and `"bob"` with valid passwords -> **`200 OK`** returning `{ "token": "..." }`. Save both `aliceToken` and `bobToken`.

### 4. Poll Creation & Creator-Only RBAC (`401` vs `403`)
- **Unauthenticated Check:** `POST http://localhost:3000/api/polls` with no `Authorization` header -> **`401 Unauthorized`**.
- **Create Poll:** `POST http://localhost:3000/api/polls` with `Authorization: Bearer <aliceToken>` and body `{"question": "Best Node.js framework?", "options": ["Express", "Fastify"]}` -> **`201 Created`**. Save `poll.id` and `options[0].id`.
- **RBAC Rejection:** `DELETE http://localhost:3000/api/polls/<pollId>` using **`<bobToken>`** -> **`403 Forbidden`** (Bob is authenticated, but is not the poll creator).

### 5. Voting & Duplicate Vote Prevention (`409 Conflict`)
- **First Vote:** `POST http://localhost:3000/api/polls/<pollId>/vote` with `<bobToken>` and `{"optionId": "<optionId>"}` -> **`200 OK`** (`votes` increments to `1`).
- **Duplicate Vote:** Repeat the exact same vote request with `<bobToken>` -> **`409 Conflict`** (`votes` remains `1`).

### 6. Live WebSocket Broadcast & Disconnect Resilience
- **Connect:** Open a WebSocket tab in Postman/Insomnia to `ws://localhost:3000` -> **`101 Switching Protocols`**.
- **Broadcast:** Keep the WebSocket tab open and cast a vote via HTTP (`POST /api/polls/<pollId>/vote`) using `<aliceToken>`. Confirm the WebSocket feed immediately receives the `VOTE_UPDATE` JSON payload with `votes: 2`.
- **Disconnect Safety:** Close the WebSocket tab, register a third user (`charlie`), and cast a vote via HTTP -> **`200 OK`** with no server crash.