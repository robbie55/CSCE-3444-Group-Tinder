# Architecture — Group Meet App

> Engineering reference extracted from SRS v1.0. This is what Claude needs to know to write correct code.

---

## What This App Does

A platform for UNT students to find other students to work with on projects (coursework or personal). Core loop: sign up → build a profile → get matched with compatible students → form groups → chat.

---

## Data Models

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // never store plaintext
  profile: UserProfile;
  groups: Group["id"][];
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  displayName: string;
  bio?: string;
  major?: string;
  skills: string[];
  courses: string[]; // current or past courses relevant to matching
  avatarUrl?: string;
  socials: {
    github?: string;
    linkedin?: string;
  };
}

interface Group {
  id: string;
  name: string;
  isDirect: boolean; // true = DM between 2 users, false = named group
  createdBy: User["id"];
  members: User["id"][];
  chats: GroupChat["id"][];
  createdAt: Date;
}

interface GroupChat {
  id: string;
  groupId: Group["id"];
  messages: Message[];
}

interface Message {
  id: string;
  senderId: User["id"];
  content: string;
  createdAt: Date; // SRS specifies messages must be dated
}
```

---

## Views / Pages

| Route | View | Description |
|-------|------|-------------|
| `/login` | Login | Username + password, link to register |
| `/register` | Register | Account creation with profile info fields |
| `/dashboard` | Dashboard (main page) | Search bar, grid of suggested user cards |
| `/search` | Search | Search bar + list of student profile cards |
| `/profile/:id` | Profile View | Picture, bio, info, linked socials |
| `/profile/me` | Own Profile | Editable version of profile view |
| `/groups/:id` | Group View | Member list, active group chat(s), completed/due status |

---

## API Endpoints

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

# Users
GET    /api/users/:id            # get single user
GET    /api/users                 # search/list users (query params for filtering)
PUT    /api/users/:id            # update profile
DELETE /api/users/:id            # delete account

# Matching
GET    /api/users/suggestions    # matchmaking algorithm serves suggested users

# Groups
POST   /api/groups               # create group
GET    /api/groups/:id           # get group details
PUT    /api/groups/:id           # update group
DELETE /api/groups/:id           # delete group
GET    /api/users/:id/groups     # get all groups for a user

# Messaging (unified: DMs are groups with isDirect=true and 2 members)
GET    /api/groups/:id/chats     # get chats in a group (or DM)
POST   /api/groups/:id/chats     # create a new chat in a group (or DM)
GET    /api/chats/:id/messages   # get message history
POST   /api/chats/:id/messages   # send message
POST   /api/groups/dm/:userId    # get-or-create a DM group with a user
```

---

## Key Business Rules (INVARIANTS)

- All users must be UNT students (enforce via email domain or similar during registration)
- Passwords are always stored encrypted, never plaintext
- A user can create and join multiple groups
- A user can message any other user, even if they don't share a group
- Messages must include timestamps
- Matching suggestions use Jaccard similarity on skills + courses arrays (see Tech Decisions below)
- The app must work on latest Chrome and Firefox, and be responsive for mobile and desktop

---

## Non-Functional Constraints

- **Concurrency target:** 1,000 concurrent users (design for this but don't over-engineer early)
- **Message latency:** Near real-time delivery via short polling (~5s); WebSocket upgrade as future enhancement
- **Availability:** 24/7 US availability (standard deployment practices, nothing exotic)

---

## Tech Decisions (Resolved)

- [x] **Database:** MongoDB Atlas. Already connected via pymongo in `backend/app/db/connect.py`. Flexible schema fits our models well enough and avoids migration tooling overhead.

- [x] **Auth strategy:** JWT (stateless) stored in httpOnly cookies. `python-jose` for token encoding, `passlib[bcrypt]` for password hashing. UNT-only enforcement is handled by validating `@my.unt.edu` email domain at registration — no SSO integration.

- [x] **Real-time:** Not using WebSockets for v1. Chat uses standard REST endpoints with optional short polling (~5s) on the frontend for near-real-time feel. WebSocket support can be added later using FastAPI's built-in WebSocket support if needed. This avoids connection management, WS auth, reconnection logic, and deployment complexity.

- [x] **Hosting:** Vercel for the Vite frontend (zero-config GitHub deploys). Railway or Render for the FastAPI backend (free tier, GitHub deploys, env var support). MongoDB Atlas is already cloud-hosted.

- [x] **Matching algorithm:** Jaccard similarity on the union of a user's `skills` and `courses` arrays. `score(A, B) = |A ∩ B| / |A ∪ B|`. Return top N users sorted by score descending, with optional same-major tiebreaker. Lives in `backend/app/core/`.

- [x] **Direct messaging architecture:** Unified with group chats. A DM is a `Group` with `isDirect: true` and exactly 2 members. All existing group/chat/message endpoints work for both. Frontend renders DM groups differently (shows the other user's name instead of a group name). One messaging system, not two.
