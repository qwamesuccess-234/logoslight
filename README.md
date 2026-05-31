# LogosLight — Bible Study Platform

> A production-ready full-stack Bible study app for deeper knowledge of God.
> Built as a **system design learning project** — every file explains the *why*, not just the *what*.

![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![React](https://img.shields.io/badge/react-18+-61DAFB.svg)
![Django](https://img.shields.io/badge/django-4.2+-092E20.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## What You Can Do

| Feature | Description |
|---|---|
| 📖 Scripture Reader | Search and read the Bible via the scripture.api.bible API |
| 🔖 Bookmarks | Save verses with personal notes |
| ☀️ Daily Devotionals | Curated reading plans with reflection questions |
| 📝 Study Notes | Private journal tied to Bible references |
| 👥 Community | Post discussions, reply, grow together |
| 🔐 Authentication | Clerk-powered sign-up, sign-in, OAuth, MFA |

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Web UI (responsive, mobile-first) |
| Auth | **Clerk** | Sign-up, sign-in, JWT, OAuth, webhooks |
| Database | **Supabase** (PostgreSQL) | Data storage + Row-Level Security |
| File Storage | **Supabase Storage** | User avatars |
| Backend API | Django 4.2 + Django REST Framework | Business logic, REST API |
| API Docs | drf-spectacular (Swagger + ReDoc) | Auto-generated API reference |

---

## Project Structure

```
logoslight/
├── backend/                     ← Django REST API
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py          ← Shared settings (DB, DRF, Clerk, Supabase)
│   │   │   ├── dev.py           ← Development overrides
│   │   │   └── prod.py          ← Production hardening (HTTPS, secure cookies)
│   │   ├── urls.py              ← API router (all /api/v1/* routes)
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── core/
│   │   │   ├── authentication.py  ← ClerkAuthentication (JWT verification)
│   │   │   └── permissions.py     ← IsOwner, IsOwnerOrReadOnly
│   │   ├── users/               ← Profiles + Clerk webhook sync
│   │   ├── bible/               ← Bookmarks, reading progress, Bible API proxy
│   │   ├── devotional/          ← Reading plans, daily devotionals
│   │   ├── notes/               ← Personal study journal
│   │   └── community/           ← Discussion posts + comments
│   ├── requirements.txt
│   ├── manage.py
│   └── .env.example
├── frontend/                    ← React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── AppLayout.jsx     ← Sidebar + bottom nav (responsive)
│   │   │       └── ProtectedRoute.jsx
│   │   ├── pages/               ← One file per page/route
│   │   ├── hooks/
│   │   │   └── useApiClient.js  ← Axios + Clerk JWT interceptor
│   │   ├── lib/
│   │   │   └── supabase.js      ← Clerk-authenticated Supabase client
│   │   ├── App.jsx              ← Router definition
│   │   └── main.jsx             ← ClerkProvider + QueryClientProvider
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
└── docs/
    └── supabase_rls_setup.sql   ← Run in Supabase SQL Editor
```

---

## Prerequisites

- **Python** 3.11+ — [python.org](https://www.python.org/downloads/)
- **Node.js** 18+ — [nodejs.org](https://nodejs.org/)
- **Git** — [git-scm.com](https://git-scm.com/)
- A **Clerk** account (free) — [clerk.com](https://clerk.com)
- A **Supabase** account (free) — [supabase.com](https://supabase.com)
- A **Bible API** key (free) — [scripture.api.bible](https://scripture.api.bible)

---

## Service Setup

### 1. Clerk Setup

1. Go to [clerk.com](https://clerk.com) → **Create application**
2. Choose sign-in methods: Email, Google, GitHub (your choice)
3. From **API Keys**, copy:
   - `Publishable Key` → goes in `frontend/.env.local`
   - `Secret Key` → **backend only**, never expose to browser
4. From **JWT Templates** → **New template → Supabase**
   - This issues Supabase-compatible tokens for RLS
5. From **Webhooks → Add endpoint**:
   - URL: `https://your-backend.com/webhooks/clerk/`
   - Events: ✅ `user.created` ✅ `user.updated` ✅ `user.deleted`
   - Copy the **Signing Secret** (`whsec_...`)

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) → **New project**
2. From **Project Settings → API**, copy:
   - **Project URL** → both frontend and backend `.env`
   - **anon/public key** → frontend only
   - **service_role key** → backend only (⚠️ bypasses RLS)
3. From **Project Settings → Database → Connection string → Session mode**:
   - Copy the PostgreSQL URL → `DATABASE_URL` in `backend/.env`
4. From **Authentication → JWT Settings**:
   - Add Clerk JWKS URL: `https://YOUR_CLERK_DOMAIN/.well-known/jwks.json`
5. In **SQL Editor**, run the contents of `docs/supabase_rls_setup.sql`
6. From **Storage**, create bucket: `avatars` (public)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/logoslight.git
cd logoslight
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Open .env and fill in all values (see Service Setup above)

# Run database migrations (connects to your Supabase PostgreSQL)
python manage.py migrate

# Create a superuser (for Django Admin at /admin/)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

Backend available at: **http://localhost:8000**
API Docs: **http://localhost:8000/api/docs/**

### 3. Frontend Setup

```bash
# Open a new terminal tab
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Open .env.local and fill in Clerk + Supabase values

# Start the Vite dev server
npm run dev
```

Frontend available at: **http://localhost:5173**

---

## Environment Variables

### `backend/.env`

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:5432/postgres

CORS_ALLOWED_ORIGINS=http://localhost:5173

CLERK_DOMAIN=clerk.your-app.clerkapps.com
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx

SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1...   # BACKEND ONLY — never expose

BIBLE_API_KEY=your-bible-api-key
```

### `frontend/.env.local`

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
VITE_API_URL=http://localhost:8000/api/v1
```

> ⚠️ **Security rule**: `SUPABASE_SERVICE_KEY` bypasses Row-Level Security.
> It's like a DB root password — backend only, never in any frontend file.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/users/me/` | GET / PATCH | Current user profile |
| `/api/v1/bible/search/?q=love` | GET | Search scripture |
| `/api/v1/bible/passage/?book=JHN&chapter=3` | GET | Read a chapter |
| `/api/v1/bible/bookmarks/` | GET / POST | List / add bookmarks |
| `/api/v1/devotional/plans/` | GET | Browse reading plans |
| `/api/v1/devotional/my-progress/` | GET / POST / PATCH | Track plan progress |
| `/api/v1/notes/` | GET / POST | List / create study notes |
| `/api/v1/notes/{id}/` | GET / PATCH / DELETE | Read / edit / delete a note |
| `/api/v1/community/posts/` | GET / POST | Browse / create discussions |
| `/api/v1/community/posts/{id}/comments/` | GET / POST | Read / add comments |
| `/api/docs/` | GET | Swagger UI (interactive) |
| `/api/redoc/` | GET | ReDoc documentation |
| `/webhooks/clerk/` | POST | Clerk user lifecycle events |

All endpoints require `Authorization: Bearer <clerk_jwt>` except `/webhooks/clerk/`.

---

## Running Tests

```bash
# Backend
cd backend
source venv/bin/activate
python manage.py test apps/

# With coverage
pip install coverage
coverage run manage.py test apps/
coverage report -m

# Frontend
cd frontend
npm run test:run
```

---

## ─────────────────────────────────────────────
## Git & GitHub — Complete Guide
## ─────────────────────────────────────────────

### What is Git?
Git is a **version control system**. It tracks every change you make to your code,
lets you go back in time, and enables collaboration.

Key concepts:
- **Repository (repo)** — a folder tracked by Git
- **Commit** — a saved snapshot of your code at a point in time
- **Branch** — a parallel version of your code (main, feature/login, bugfix/...)
- **Remote** — a copy of your repo on a server (GitHub, GitLab, etc.)
- **Push** — send your local commits to the remote
- **Pull** — get remote commits onto your local machine

---

### Step 1 — Configure Git (one time only)

```bash
# Set your name and email (shows up in commit history)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Verify
git config --global --list
```

---

### Step 2 — Initialise the Repository

```bash
# From the project root (logoslight/)
cd logoslight

# Initialise a Git repo
git init

# Check status — shows all untracked files
git status
```

---

### Step 3 — Stage and Commit

```bash
# Stage ALL files for the first commit
git add .

# Check what's staged (should NOT include .env files — they're in .gitignore)
git status

# Create the first commit
git commit -m "Initial commit: LogosLight Bible study platform"

# Good commit message format:
#   <type>: <short description>
#   Types: feat, fix, docs, refactor, test, chore
#
# Examples:
#   feat: add Bible search endpoint
#   fix: correct RLS policy for study notes
#   docs: update README with deployment steps
```

---

### Step 4 — Create a GitHub Repository

1. Go to [github.com](https://github.com) → sign in
2. Click **+** → **New repository**
3. Set:
   - **Repository name**: `logoslight`
   - **Visibility**: Public or Private (your choice)
   - ❌ Do NOT check "Add a README" (we already have one)
   - ❌ Do NOT add .gitignore (we already have one)
4. Click **Create repository**
5. GitHub shows you setup commands — copy your repo URL:
   `https://github.com/YOUR_USERNAME/logoslight.git`

---

### Step 5 — Connect Local Repo to GitHub and Push

```bash
# Add GitHub as the "origin" remote
git remote add origin https://github.com/YOUR_USERNAME/logoslight.git

# Rename the default branch to 'main' (GitHub standard)
git branch -M main

# Push your code to GitHub
# -u sets the upstream so future 'git push' works without arguments
git push -u origin main
```

Visit `https://github.com/YOUR_USERNAME/logoslight` — your code is live!

---

### Step 6 — Daily Git Workflow

```bash
# 1. Always pull before starting work (get latest changes)
git pull origin main

# 2. Create a feature branch for new work
git checkout -b feat/add-prayer-tracker

# 3. Make your changes, then check what changed
git status
git diff                          # See exact line-level changes

# 4. Stage specific files (preferred over 'git add .')
git add backend/apps/notes/models.py
git add frontend/src/pages/NotesPage.jsx

# Or stage all changes in a directory
git add frontend/src/

# 5. Commit with a meaningful message
git commit -m "feat: add prayer section to devotional cards"

# 6. Push your branch to GitHub
git push origin feat/add-prayer-tracker

# 7. On GitHub, open a Pull Request from your branch → main
#    Review the diff, then merge.

# 8. After merging, switch back to main and pull
git checkout main
git pull origin main

# 9. Delete the merged branch
git branch -d feat/add-prayer-tracker
```

---

### Step 7 — Useful Git Commands

```bash
# See commit history (press Q to quit)
git log --oneline --graph

# Undo last commit (keeps changes in working directory)
git reset --soft HEAD~1

# Discard ALL uncommitted changes (CAREFUL — cannot undo)
git checkout -- .

# See which branch you're on
git branch

# See all remote branches
git branch -r

# Stash changes temporarily (e.g. to switch branches)
git stash
git stash pop                     # Restore stashed changes

# Tag a release
git tag -a v1.0.0 -m "First release"
git push origin --tags
```

---

### Step 8 — Protecting Secrets

The `.gitignore` file prevents secret files from being committed:

```
# These files are ignored by Git (never committed)
backend/.env          ← Contains DB passwords, API keys
frontend/.env.local   ← Contains Clerk + Supabase keys
node_modules/         ← Huge folder, not needed in repo
venv/                 ← Python virtual environment
```

**Verify before every push:**
```bash
git status            # .env files should NEVER appear here
git diff --cached     # Review exactly what will be committed
```

If you accidentally committed a secret:
```bash
# Remove it from the last commit
git rm --cached backend/.env
git commit --amend -m "chore: remove accidentally committed env file"
git push --force-with-lease origin main
# ⚠️ Also rotate (regenerate) the exposed key immediately — assume it was seen
```

---

## Deployment

### Backend (Railway / Render / Fly.io)
1. Set all `backend/.env` variables in the hosting dashboard
2. Change `DEBUG=False` and `DJANGO_SETTINGS_MODULE=config.settings.prod`
3. Start command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
4. Update Clerk webhook URL to your production domain

### Frontend (Vercel / Netlify)
1. Connect your GitHub repo to Vercel/Netlify
2. Set build command: `npm run build`, output dir: `dist`
3. Set all `frontend/.env.local` variables in the dashboard
4. Update `VITE_API_URL` to your production backend URL
5. Add your production domain to Clerk **Allowed origins**

---

## Security Summary

| Layer | Rule |
|---|---|
| Clerk | Never build custom auth. Never put SECRET_KEY in frontend. |
| Supabase | RLS on ALL tables. SERVICE_KEY is backend-only. |
| Django | Every request verified via ClerkAuthentication. |
| Webhook | Clerk events verified via svix signature before processing. |
| Secrets | Zero secrets in code. All in `.env`. `.env` in `.gitignore`. |
| API | Rate limiting on all endpoints. Pagination on all list queries. |

---

## License

MIT © LogosLight — Built for the glory of God and the growth of His people.