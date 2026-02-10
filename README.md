--------------------------------------------------------------------------------
Group Meet App (UNT)
Welcome to the development repository for the Group Meet App. This project uses a Monorepo structure, meaning both the Frontend (React) and Backend (Python) live here together.
🛠 Prerequisites
Before you begin, ensure you have the following installed on your machine:
1. VS Code (Our primary editor)
2. Node.js (v18 or higher) - Download Here
3. Python (v3.10 or higher) - Download Here
4. Git - Download Here

--------------------------------------------------------------------------------
⚙️ VS Code Setup (Do This First!)
To make development easy, we enforce specific code styles automatically. Follow these steps to configure VS Code so it fixes your code every time you hit "Save."
1. Install Extensions
Open VS Code, go to the Extensions tab (square icon on the left), and install these:
• ESLint (Microsoft) - Finds errors in React/JS.
• Prettier - Code formatter (Prettier) - Makes JS code look nice.
• Ruff (Astral Software) - Super-fast Python linter and formatter.
• Python (Microsoft) - Standard Python support.
• ES7+ React/Redux/React-Native snippets (optional but helpful).
2. Workspace Settings (The Magic Step)
To ensure your auto-save works exactly like the rest of the team:
1. Create a folder named .vscode in the root of this project (if it doesn't exist).
2. Inside it, create a file named settings.json.
3. Paste the following code into settings.json:
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
Now, whenever you save a .py or .jsx file, VS Code will automatically format it to match our project rules.

--------------------------------------------------------------------------------
💻 Frontend Setup (React)
Our frontend is built with Vite + React. It lives in the /frontend folder.
1. Install Dependencies
Open your terminal in the root folder:
cd frontend
npm install
2. Running the Development Server
npm run dev
Open your browser to the local link provided (usually http://localhost:5173).
3. Understanding the Tools
• Linting (ESLint): We use this to catch bugs (like unused variables). If you see red squiggly lines, hover over them to see what's wrong.
• Formatting (Prettier): We use this to ensure everyone's code looks the same (indentation, quotes).
• Commands:
    ◦ npm run lint: Checks for errors.
    ◦ npm run lint:fix: Tries to auto-fix errors.

--------------------------------------------------------------------------------
🐍 Backend Setup (Python)
Our backend is built with FastAPI. It lives in the /backend folder.
1. Create a Virtual Environment
It is best practice to keep our project dependencies separate from your global Python install.
cd backend

# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
(You will know it worked if you see (venv) in your terminal prompt).
2. Install Dependencies
pip install -r requirements.txt
3. Understanding the Tools (Ruff)
We use Ruff to lint and format our Python code. It replaces tools like Black, Flake8, and Isort.
• To check for errors: ruff check .
• To auto-fix format: ruff format .
(Note: If you set up the VS Code settings above, this happens automatically on save!)

--------------------------------------------------------------------------------
📂 Project Structure
We follow a Monorepo structure. Here is where everything lives:
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
🚀 Workflow
1. Always pull the latest changes before starting work: git pull origin main.
2. Create a branch for your feature: git checkout -b feature/my-new-feature.
3. Commit often.
4. Open a Pull Request (PR) on GitHub when you are ready to merge.
    ◦ Note: We have automated checks running. If your code isn't formatted correctly, the PR will fail. Run npm run lint or ruff check locally to be safe.
