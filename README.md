# TeamFlow — Team Task Manager

A full-stack web app for managing team projects and tasks with role-based access control.

## Features

- **Authentication** — Signup/login with JWT tokens, session persistence
- **Role-based access** — Admin and Member roles at both system and project level
- **Projects** — Create, view, update and delete projects; invite/remove team members
- **Kanban board** — Tasks organized in To Do / In Progress / Done columns
- **Dashboard** — Overview of your tasks, counts by status, and overdue alerts
- **Task management** — Create tasks with title, description, priority, assignee, and due date

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Tailwind CSS, Vite |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Deployment | Railway |

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or [Railway](https://railway.app))

### Setup

```bash
# Clone the repo
git clone https://github.com/Anubhav-vv/team-task-manager
cd team-task-manager

# Install dependencies
npm install
cd client && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Start development servers
# Terminal 1 — backend
npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:5000`.

## Deployment on Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** plugin to your project
4. Set environment variables:
   - `JWT_SECRET` — any long random string
   - `NODE_ENV` — `production`
   - `DATABASE_URL` — auto-provided by Railway PostgreSQL plugin
5. Deploy — Railway runs `npm install` then `node server.js`

The Express server automatically serves the React build in production.

## API Endpoints

```
POST   /api/auth/register       Create account
POST   /api/auth/login          Login
GET    /api/auth/me             Current user

GET    /api/projects            List my projects
POST   /api/projects            Create project
GET    /api/projects/:id        Project detail + members
PUT    /api/projects/:id        Update project
DELETE /api/projects/:id        Delete project
POST   /api/projects/:id/members        Add member
DELETE /api/projects/:id/members/:uid   Remove member

GET    /api/tasks?projectId=X   List tasks (filterable)
GET    /api/tasks/dashboard     Dashboard stats
POST   /api/tasks               Create task
PUT    /api/tasks/:id           Update task
DELETE /api/tasks/:id           Delete task

GET    /api/users               List all users
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
