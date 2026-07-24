# Implementation Progress

## Complete

| Feature                   | Details                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prisma Schema             | All 6 models (User, Account, Session, VerificationToken, Category, Transaction) with all columns, constraints, indexes, enums, and relationships per PLAN.md |
| Remove type columns       | Removed `TransactionType` enum and `type` column from Category and Transaction models; polarity determined by sign of `amount`                               |
| Database Migration        | Initial migration applied (`prisma/migrations/20260702151201_init/`)                                                                                         |
| Auth.js v5 + Google OAuth | Config in `src/lib/auth.ts` with `@auth/prisma-adapter` and `PrismaPg` PostgreSQL adapter                                                                    |
| Auth API Route            | `src/app/api/auth/[...nextauth]/route.ts` exports GET/POST                                                                                                   |
| Prisma Client             | Singleton pattern in `src/lib/prisma.ts`                                                                                                                     |
| Login Page                | `src/app/page.tsx` — "Sign in with Google" button, redirects authenticated users to `/dashboard`                                                             |
| Route Protection          | `src/proxy.ts` — NextAuth v5 proxy middleware guards `/dashboard/:path*`, `/transactions/:path*`, `/categories/:path*`                                       |
| Runtime Dependencies      | Next.js 16, React 19, Auth.js, Prisma 7, Chart.js, react-chartjs-2, Tailwind CSS v4                                                                          |
| Project Config            | `next.config.ts`, `tsconfig.json`, `eslint`, `prettier`, `postcss`                                                                                           |
| Environment               | `.env` with `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                                                                            |
| App Layout                | `src/app/(app)/layout.tsx` — authed shell with sidebar + content area                                                                                        |
| Sidebar                   | `src/components/layout/Sidebar.tsx` — nav links (Dashboard, Transactions, Categories), active state, sign out                                                |
| Pagination                | `src/components/ui/Pagination.tsx` — Prev/Next, page numbers with ellipsis, "Page X of Y" indicator                                                          |
| Color Scheme              | Custom tokens: `--color-primary`, `--color-secondary`, `--color-tertiary`, `--color-neutral`                                                                 |
| Category CRUD             | Server actions + page for create, read, update, delete; CategoryTable with functional Edit/Delete buttons; error handling on delete                          |
| Default Categories        | Default categories (Food, Transport, Housing, Utilities, Entertainment, Salary, Other) auto-created via Auth.js `events.createUser` on first signup          |

## In Progress

| Feature             | Details                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit Tests (Vitest) | Vitest installed; full category CRUD test coverage (`getCategories`, `createCategory`, `deleteCategory`, `renameCategory`); full transaction CRUD test coverage; all 4 dashboard actions covered in `tests/actions/dashboard.test.ts` |
| Transactions Page   | `src/app/transactions/` — mock data removed; server actions for `getTransactions` and `createTransaction` in `src/actions/transactions.ts`; client fetches categories from server; add wired                                          |

## Complete (cont.)

| Feature                     | Details                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction Actions         | `getTransactions`, `createTransaction` wired; test coverage for all 4 actions in `tests/actions/transactions.test.ts`                                                                                                                                                                                                                                    |
| Dashboard                   | Summary cards (week income/expense, net balance, dynamic period net flow) + unified Weekly/Monthly/Quarterly/Yearly/YTD time range selector at heading level controls both charts + PieChart + LineChart + recent transactions table with link to /transactions; data fetching consolidated into single `getDashboardData` call (1× auth, 1× round-trip) |
| Chart Components            | `src/components/charts/PieChart.tsx`, `src/components/charts/LineChart.tsx` using Chart.js + react-chartjs-2; LineChart shows future dates greyed out with dashed line                                                                                                                                                                                   |
| Dashboard Actions           | `src/actions/dashboard.ts` — `getDashboardSummary`, `getExpensesByCategory`, `getCashFlow`, `getRecentTransactions`, plus consolidated `getDashboardData` that calls all four with a single auth check                                                                                                                                                   |
| Integration Test Setup      | `docker-compose.yml` (postgres:16 test DB on port 5433), `vitest.integration.config.ts` with global setup running `prisma migrate deploy`, `npm run test:integration` script, postgres service + integration step wired into CI (`.github/workflows/ci.yml`)                                                                                             |
| Dashboard Integration Tests | `tests/integration/dashboard.test.ts` — 12 tests against the real test DB: all 5 dashboard actions (aggregations, period filters, category breakdowns, cash-flow series, recent transactions, consolidated call) plus multi-tenancy isolation; tables truncated between tests                                                                            |

## Not Started

| Feature                         | Details                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Integration Tests (other areas) | Transactions/categories server actions, FK constraints — setup exists, tests TBD |
| E2E Tests (Playwright)          | Not installed, no config, no test files                                          |
| Lib Utilities                   | No formatting, validation, or helper utilities                                   |
