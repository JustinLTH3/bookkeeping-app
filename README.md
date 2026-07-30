# Bookkeeping App

Personal finance tracking app built with Next.js 16.

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Framework | Next.js 16 (App Router, TypeScript)     |
| Styling   | Tailwind CSS v4                         |
| Auth      | Auth.js (NextAuth v5) — Google OAuth     |
| Database  | PostgreSQL                              |
| ORM       | Prisma 7                                |
| Charts    | Chart.js + react-chartjs-2              |

## Features

- **Google SSO login** — sign in/out, protected routes via middleware
- **Dashboard** — summary cards (income/expense/net) + bar/pie/line charts with configurable time periods
- **Transactions** — CRUD with server-side pagination, date/category filters
- **Categories** — CRUD for income and expense categories; defaults created on first signup

## Getting Started

```bash
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
npm install
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                    | Description                            |
| -------------------------- | -------------------------------------- |
| `npm run dev`              | Start development server               |
| `npm run build`            | Build for production                   |
| `npm run lint`             | Lint with ESLint                       |
| `npm run typecheck`        | TypeScript check                       |
| `npm test`                 | Unit tests (Vitest)                    |
| `npm run test:integration` | Integration tests (requires test DB)   |

## Testing

- **Unit tests** (`npm test`) — pure logic, no database needed.
- **Integration tests** (`npm run test:integration`) — run against a dedicated PostgreSQL database. Start with `docker compose up -d` (postgres:16 on port 5433) or set `TEST_DATABASE_URL`. Migrations are applied automatically. Includes 50k-row scale tests; configure with `SCALE_ROWS`.
