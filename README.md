# VedaAI — AI Assessment Creator

A full-stack monorepo for AI-powered exam paper generation.

## Architecture

```
veda-ai/
├── apps/
│   ├── frontend/     Next.js 14 + TypeScript + Redux Toolkit + WebSocket
│   └── backend/      Node.js + Express + TypeScript
├── packages/
│   └── shared/       Shared TypeScript types
└── docker-compose.yml  MongoDB + Redis
```

### Request Flow
```
Teacher submits form
  → POST /api/assignments
  → BullMQ job queued in Redis
  → Worker picks job → calls Claude AI
  → Parses structured JSON response
  → Saves paper to MongoDB
  → Redis cache updated
  → WebSocket pushes JOB_COMPLETED to frontend
  → Redux store updated → React re-renders paper
```

## Tech Stack

| Layer     | Tech                                           |
|-----------|------------------------------------------------|
| Frontend  | Next.js 14, TypeScript, Redux Toolkit, Tailwind|
| Backend   | Node.js, Express, TypeScript                   |
| Queue     | BullMQ + Redis                                 |
| Database  | MongoDB + Mongoose                             |
| Realtime  | WebSocket (ws)                                 |
| AI        | Anthropic Claude API                           |
| PDF       | Puppeteer                                      |

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Anthropic API Key

### 1. Clone & Install
```bash
git clone <repo>
cd veda-ai
npm install
```

### 2. Environment Setup
```bash
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env and set ANTHROPIC_API_KEY

cp apps/frontend/.env.example apps/frontend/.env.local
```

### 3. Start Infrastructure
```bash
docker-compose up -d
```

### 4. Run Dev Servers
```bash
npm run dev
# Frontend → http://localhost:3000
# Backend  → http://localhost:4000
```

## API Reference

| Method | Path                              | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | /api/assignments                  | Create + queue generation job  |
| GET    | /api/assignments                  | List all assignments           |
| GET    | /api/assignments/:id              | Get single assignment          |
| GET    | /api/assignments/:id/result       | Get generated paper            |
| POST   | /api/assignments/:id/regenerate   | Re-queue generation            |
| GET    | /api/assignments/:id/pdf          | Download paper as PDF          |
| DELETE | /api/assignments/:id              | Delete assignment              |
| WS     | ws://localhost:4000/ws            | Real-time job updates          |

## WebSocket Events

```json
// Server → Client
{ "type": "JOB_QUEUED",     "assignmentId": "...", "jobId": "..." }
{ "type": "JOB_PROCESSING", "assignmentId": "...", "progress": 30 }
{ "type": "JOB_COMPLETED",  "assignmentId": "...", "result": { ... } }
{ "type": "JOB_FAILED",     "assignmentId": "...", "error": "..." }

// Client → Server
{ "type": "SUBSCRIBE", "assignmentId": "..." }
```

## Redux Store Shape

```ts
{
  assignments: {
    items: Assignment[];          // all loaded assignments
    status: 'idle'|'loading'|'succeeded'|'failed';
    error: string | null;
    jobProgress: Record<string, number>;  // assignmentId → 0–100
    jobStatus:   Record<string, string>;  // assignmentId → message
  }
}
```

## Features

- ✅ Assignment creation form with full validation
- ✅ File upload (PDF/TXT) for AI context
- ✅ AI-powered question paper generation (Claude)
- ✅ Sections A, B, C… with difficulty badges
- ✅ Real-time progress via WebSocket → Redux
- ✅ Background jobs with BullMQ
- ✅ MongoDB persistence + Redis caching
- ✅ PDF export via Puppeteer
- ✅ Regenerate paper action
- ✅ Mobile responsive with bottom nav
- ✅ Student info section on paper
