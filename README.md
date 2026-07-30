# Bookkeeping App

Personal finance tracking app built with Next.js 16.

## Tech Stack

| Layer      | Technology                                                    |
| ---------- | ------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend    | Next.js Route Handlers, server components                     |
| Database   | PostgreSQL                                                    |
| ORM        | Prisma 7                                                      |
| Auth       | Auth.js (NextAuth v5) — Google OAuth                          |
| Charts     | Chart.js + react-chartjs-2                                    |

## Prerequisites

- **Node.js** >= 22
- **PostgreSQL** running locally or remotely
- **npm** (or yarn / pnpm / bun)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/JustinLTH3/bookkeeping-app.git
   cd bookkeeping-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL`, `TEST_DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`.

4. **Set up the database**

   ```bash
   npx prisma migrate deploy
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **Google SSO login** — sign in/out, protected routes via middleware
- **Dashboard** — summary cards (income/expense/net) + bar/pie/line charts with configurable time periods
- **Transactions** — CRUD with server-side pagination, date/category filters
- **Categories** — CRUD for income and expense categories; defaults created on first signup

## Project Structure

```
app/              # Next.js App Router pages and API routes
components/       # React components (auth, dashboard, transactions, categories)
lib/              # Server helpers (auth, db, validation)
prisma/           # Prisma schema and migrations
tests/            # Vitest test suites
types/            # TypeScript declarations
```

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
