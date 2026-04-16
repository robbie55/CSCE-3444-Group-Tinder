---

# Group Meet App (UNT)

Welcome to the development repository for the Group Meet App. This project uses a **Monorepo** structure, meaning both the Frontend (React) and Backend (Python) live here together.

## 🛠 Prerequisites

Before you begin, ensure you have the following installed on your machine:

1.  **VS Code** (Our primary editor)
2.  **Node.js** (v18 or higher) - [Download Here](https://nodejs.org/)
3.  **Python** (v3.10 or higher) - [Download Here](https://www.python.org/)
4.  **Git** - [Download Here](https://git-scm.com/)

---

## ⚙️ VS Code Setup (Do This First!)

To make development easy, we enforce specific code styles automatically. Follow these steps to configure VS Code so it fixes your code every time you hit "Save."

### 1. Install Extensions

Open VS Code, go to the Extensions tab (square icon on the left), and install these:

- **ESLint** (Microsoft) - _Finds errors in React/JS._
- **Prettier - Code formatter** (Prettier) - _Makes JS code look nice._
- **Ruff** (Astral Software) - _Super-fast Python linter and formatter._
- **Python** (Microsoft) - _Standard Python support._
- **ES7+ React/Redux/React-Native snippets** (optional but helpful).

### 2. Workspace Settings (The Magic Step)

To ensure your auto-save works exactly like the rest of the team:

1.  Create a folder named `.vscode` in the root of this project (if it doesn't exist).
2.  Inside it, create a file named `settings.json`.
3.  Paste the following code into `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.organizeImports": "explicit"
  },
  // Frontend Rules (Prettier + ESLint)
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },

  // Backend Rules (Ruff)
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  }
}
```

_Now, whenever you save a `.py` or `.jsx` file, VS Code will automatically format it to match our project rules._

---

## 💻 Frontend Setup (React)

Our frontend is built with **Vite** + **React**. It lives in the `/frontend` folder.

### 1. Install Dependencies

Open your terminal in the root folder:

```bash
cd frontend
npm install
```

### 2. Running the Development Server

```bash
npm run dev
```

Open your browser to the local link provided (usually `http://localhost:5173`).

### 3. Understanding the Tools

- **Linting (ESLint):** We use this to catch bugs (like unused variables). If you see red squiggly lines, hover over them to see what's wrong.
- **Formatting (Prettier):** We use this to ensure everyone's code looks the same (indentation, quotes).
- **Commands:**
  - `npm run lint`: Checks for errors.
  - `npm run lint:fix`: Tries to auto-fix errors.

---

## 🐍 Backend Setup (Python)

Our backend is built with **FastAPI**. It lives in the `/backend` folder.

### 1. Create a Virtual Environment

It is best practice to keep our project dependencies separate from your global Python install.

```bash
cd backend

# Windows
python -m venv .venv
.\.venv\Scripts\activate

# Mac/Linux
python3 -m venv .venv
source .venv/bin/activate
```

_(You will know it worked if you see `(.venv)` in your terminal prompt)._

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Running the Development Server

From the project root, activate the virtual environment, then start the API:

**Windows (PowerShell):**
cd backend
.\.venv\Scripts\activate
`uvicorn app.app:app --reload` **This line runs the backend server**

### 4. Understanding the Tools (Ruff)

We use **Ruff** to lint and format our Python code. It replaces tools like Black, Flake8, and Isort.

- **To check for errors:** `ruff check .`
- **To auto-fix format:** `ruff format .`

_(Note: If you set up the VS Code settings above, this happens automatically on save!)_

---

## 📂 Project Structure

We follow a Monorepo structure. Here is where everything lives:

```text
/project-root
├── /docs            # Requirements, Diagrams, NotebookLM exports
├── /backend         # Python FastAPI Application
│   ├── /app
│   │   ├── /models      # Database schemas (Pydantic/SQLAlchemy)
│   │   ├── /routers     # API Endpoints (User, Group, Match)
│   │   └── /core        # Main logic & Algorithms
│   ├── /tests           # Pytest files
│   └── pyproject.toml   # Config for Ruff
├── /frontend        # React Application
│   ├── /src
│   │   ├── /components  # Reusable UI bits (Buttons, Nav)
│   │   ├── /pages       # Full views (Dashboard, Profile)
│   │   └── /api         # API connection logic
│   └── eslint.config.js # Config for ESLint
└── README.md
```

## 📮 Postman: Direct messaging (DM)

Use this flow to exercise REST + WebSocket together. Replace placeholders with real values from your database and login responses.

**Assumptions**

- Backend is running (e.g. `uvicorn app.app:app --reload` from `/backend`, default **http://localhost:8000**).
- `JWT_SECRET` and MongoDB are configured like normal local dev.
- Set **`base_url`** to `http://localhost:8000` (use `https` / another host if yours differs).

**1. Log in two users**

For each account, send:

`POST {{base_url}}/api/auth/login`

- **Body** → **x-www-form-urlencoded**: `username` = that user’s **email**, `password` = password.

From each **200** response, copy `access_token`:

- **TOKEN_A** — User A
- **TOKEN_B** — User B

All **messages** REST calls below need **Auth** → **Bearer Token** (paste `TOKEN_A` or `TOKEN_B` depending on who is acting).

**2. Create or open a DM (User A)**

`POST {{base_url}}/api/messages/conversations`

**Headers:** `Authorization: Bearer TOKEN_A`

**Body** → **raw JSON**:

```json
{
  "other_user_id": "<USER_B_OBJECT_ID>"
}
```

Use User B’s **`_id` as a string** (from signup response, MongoDB, or your users API).

**Expected:** **200** with a conversation object. Save **`id`** from the response as **`CONV_ID`** (this is the DM’s conversation id).

**3. Send a message over HTTP (User A)**

`POST {{base_url}}/api/messages/conversations/<CONV_ID>`

**Headers:** `Authorization: Bearer TOKEN_A`

**Body** → **raw JSON**:

```json
{
  "content": "hello from Postman"
}
```

**Expected:** **201** with the created message (`_id`, `conversation_id`, `sender_id`, `content`, `created_at`). User B does **not** get this via a second HTTP call; if their WebSocket is connected, they receive **`message_created`** (step 4).

**4. Receive the message on WebSocket (User B)**

In Postman: **New** → **WebSocket**.

**URL:**

`ws://localhost:8000/api/messages/ws?token=TOKEN_B`

Use the **same** `access_token` you copied for User B in step 1 (query param `token`, no `Bearer` prefix). If you open a **second** WebSocket for the **same** user with the **same** token, the server closes the older connection (often close code **1001**) so only one active socket per user stays registered.

Click **Connect**, then repeat **step 3** as User A.

**Expected** on User B’s WebSocket **Messages** panel:

```json
{
  "type": "message_created",
  "payload": {
    "_id": "...",
    "conversation_id": "<CONV_ID>",
    "sender_id": "<USER_A_ID>",
    "content": "...",
    "created_at": "..."
  }
}
```

You can send `{"type":"ping","payload":{}}` on the socket to verify the connection; the server replies with `pong`.

**5. List conversations and message history**

As either participant (with the matching Bearer token):

`GET {{base_url}}/api/messages/conversations` — inbox for the current user.

Paginated history for one DM:

`GET {{base_url}}/api/messages/conversations/<CONV_ID>?limit=50`

Optional query: `before=<message_id>` to load older messages than that id.

---

## 🚀 Workflow

1.  **Always pull the latest changes** before starting work: `git pull origin main`.
2.  **Create a branch** for your feature: `git checkout -b feature/my-new-feature`.
3.  **Commit often.**
4.  **Open a Pull Request (PR)** on GitHub when you are ready to merge.
    - _Note: We have automated checks running. If your code isn't formatted correctly, the PR will fail. Run `npm run lint` or `ruff check` locally to be safe._
