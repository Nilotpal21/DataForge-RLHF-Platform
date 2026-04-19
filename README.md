# DataForge RLHF

A full-stack Human Feedback data collection platform for RLHF (Reinforcement Learning from Human Feedback) pipelines.

## Setup

```bash
cd dataforge-rlhf
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Credentials

| Role       | Email                        | Password      |
|------------|------------------------------|---------------|
| Admin      | admin@dataforge.ai           | admin123      |
| Annotator  | annotator@dataforge.ai       | annotator123  |
| QA         | qa@dataforge.ai              | qa123         |

## Core Loop

1. **Admin** logs in → creates a task via the 4-step wizard → publishes it
2. **Annotator** logs in → picks a task from queue → submits annotation (preference + rubric + rationale)
3. **Admin** exports data as JSONL or Anthropic preference format
4. **QA** reviews annotations, overrides disagreements

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- better-sqlite3 (SQLite, file: `dataforge.db`)
- Tailwind CSS
- jose (JWT, 8-hour expiry, httpOnly cookie)
- bcryptjs (password hashing)

## Environment Variables

Copy `.env.local` and update `JWT_SECRET` for production:

```env
JWT_SECRET=your-secret-here
DB_PATH=./dataforge.db
```
