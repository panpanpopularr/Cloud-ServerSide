# Teamulate — Online Collaborative Workspace (MVP)

This is a **ready-to-run** local MVP for Teamulate that demonstrates **Cloud + Server-side** integration patterns in a simplified setup.

- **Server-side API**: Node.js (Express + Socket.IO)
- **Frontend**: Next.js (App Router)
- **File storage**: Local folder (MVP). In production, swap to S3 presigned URLs (code prepared).
- **Activity feed**: Real-time via WebSocket.
- **Tasks & Projects**: In-memory store (MVP). You can switch to a database later.

> For the full cloud blueprint (RDS, S3, Cognito, ECS, etc.), see the design doc in your chat canvas. This repo focuses on *runnable demo* quickly.

## Quick Start

### Prereqs
- Node.js 20+
- npm 10+

### 1) Install deps
```bash
cd api && npm ci
cd ../web && npm ci
```

### 2) Run API and Web (two terminals)
**Terminal A**
```bash
cd api
npm run dev
```

**Terminal B**
```bash
cd web
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

### 3) Try the features
- Open the web app, create a Project, add Tasks, and upload Files.
- Watch **Activity Feed** update live in the sidebar.

## Production Notes (Cloud)
- Replace local file upload with **S3 presigned URLs** (code stub in `api/src/s3.ts`).
- Add a real DB (e.g., Postgres + Prisma), wire repositories in `api/src/store`.
- Add Auth (e.g., Cognito/JWT) and RBAC middleware as in the blueprint.

Happy hacking!
