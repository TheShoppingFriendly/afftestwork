# Flo — Agency OS

Full-stack agency task management platform.

**Stack:** React + Vite (GitHub Pages) · Express.js (Render) · PostgreSQL (Neon)

---

## Project Structure

```
flo-agency/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── context/         # AuthContext, AppContext
│   │   ├── components/      # Sidebar, Layout, UI primitives
│   │   ├── pages/           # Dashboard, Projects, Tasks, Team, Analytics, Timeline
│   │   └── utils/api.js     # Axios with JWT auto-refresh
│   ├── vite.config.js
│   └── .env.example
├── server/                  # Express API
│   ├── db/
│   │   ├── index.js         # Neon connection
│   │   ├── migrate.js       # Schema creation
│   │   └── seed.js          # Sample data
│   ├── middleware/
│   │   ├── auth.js          # JWT verify, role checks
│   │   └── error.js         # Validation + error handler
│   ├── routes/
│   │   ├── auth.js          # Login, refresh, logout, me
│   │   ├── projects.js      # Projects CRUD
│   │   ├── tasks.js         # Tasks, comments, time logging
│   │   └── misc.js          # Users, teams, notifications, analytics
│   ├── index.js             # Express + WebSocket server
│   └── .env.example
├── .github/workflows/
│   └── deploy.yml           # CI/CD: auto-deploy to GitHub Pages
├── render.yaml              # Render deployment config
└── README.md
```

---

## Deployment — Step by Step

### 1. Neon PostgreSQL (free)

1. Go to [neon.tech](https://neon.tech) → Create account → New project
2. Name it `flo-agency`
3. Copy the **Connection string** (starts with `postgresql://...`)
4. Keep this — you'll need it in steps 2 and 3

### 2. Render Server (free)

1. Go to [render.com](https://render.com) → Create account
2. New → **Web Service** → Connect your GitHub repo
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. Add environment variables (Environment tab):
   ```
   DATABASE_URL       = <your Neon connection string>
   JWT_SECRET         = <generate: openssl rand -base64 64>
   JWT_REFRESH_SECRET = <generate: openssl rand -base64 64>
   JWT_EXPIRES_IN     = 15m
   JWT_REFRESH_EXPIRES_IN = 7d
   NODE_ENV           = production
   CLIENT_URL         = https://YOUR-GITHUB-USERNAME.github.io/flo-agency
   RATE_LIMIT_WINDOW_MS = 900000
   RATE_LIMIT_MAX     = 100
   ```
5. Deploy → copy the URL e.g. `https://flo-agency-api.onrender.com`

### 3. Run Database Migrations

After Render deploys, run once via Render Shell (or locally with your DATABASE_URL):

```bash
cd server
DATABASE_URL="your_neon_url" node db/migrate.js
DATABASE_URL="your_neon_url" node db/seed.js
```

Or use Render's Shell tab in the dashboard.

### 4. GitHub Pages Frontend

1. In your GitHub repo → **Settings** → **Pages**
   - Source: **GitHub Actions**

2. Add GitHub Secrets (Settings → Secrets → Actions):
   ```
   VITE_API_URL   = https://flo-agency-api.onrender.com
   VITE_WS_URL    = wss://flo-agency-api.onrender.com
   ```

3. In `client/vite.config.js` change the base path to match your repo name:
   ```js
   base: '/YOUR-REPO-NAME/'  // e.g. '/flo-agency/'
   ```

4. Push to `main` → GitHub Actions builds and deploys automatically

5. Your app is live at:
   `https://YOUR-GITHUB-USERNAME.github.io/flo-agency`

---

## Local Development

```bash
# Clone and install
git clone https://github.com/you/flo-agency
cd flo-agency

# Server setup
cd server
cp .env.example .env
# Fill in DATABASE_URL in .env
npm install
node db/migrate.js
node db/seed.js
npm run dev          # API on http://localhost:4000

# Client setup (new terminal)
cd client
cp .env.example .env
# Leave VITE_API_URL empty (uses Vite proxy)
npm install
npm run dev          # App on http://localhost:5173
```

---

## Default Login Credentials

| Email | Password | Role |
|---|---|---|
| alex@flo.agency | Password123! | Admin |
| sam@flo.agency | Password123! | Manager |
| jordan@flo.agency | Password123! | Lead |
| maya@flo.agency | Password123! | Member |
| chris@flo.agency | Password123! | Member |
| dana@flo.agency | Password123! | Member |
| riley@flo.agency | Password123! | Lead |
| taylor@client.com | Password123! | Client |

**Change all passwords after first login** via the change-password API:
```
PUT /api/auth/change-password
{ "currentPassword": "Password123!", "newPassword": "YourNewPass!" }
```

---

## Security Features

- **JWT access tokens** (15min expiry) + **refresh tokens** (7 days)
- **bcrypt** password hashing (12 rounds)
- **Rate limiting** — 100 req/15min global, 10 req/15min on auth routes
- **Helmet.js** security headers
- **CORS** restricted to your GitHub Pages domain
- **Role-based access control** — 5 tiers (admin/manager/lead/member/client)
- **Project-level access** — members only see their assigned projects
- **Input validation** via express-validator on all routes
- **SQL injection prevention** via Neon's tagged template literals

---

## Role Permissions

| Feature | Admin | Manager | Lead | Member | Client |
|---|---|---|---|---|---|
| View all projects | ✅ | ✅ | Own only | Own only | — |
| Create project | ✅ | ✅ | — | — | — |
| Create/edit tasks | ✅ | ✅ | ✅ | — | — |
| Update own tasks | ✅ | ✅ | ✅ | ✅ | — |
| View analytics | ✅ | ✅ | — | — | — |
| Manage users | ✅ | — | — | — | — |
| View team | ✅ | ✅ | ✅ | Own team | — |

---

## API Reference

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/change-password

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/:id/activity

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/tasks/:id/comments
POST   /api/tasks/:id/comments
POST   /api/tasks/:id/time

GET    /api/users
POST   /api/users
PUT    /api/users/:id
PUT    /api/users/:id/deactivate

GET    /api/teams
GET    /api/notifications
PUT    /api/notifications/read-all
PUT    /api/notifications/:id/read
GET    /api/analytics/overview

GET    /health
WS     /ws?userId=<id>
```
