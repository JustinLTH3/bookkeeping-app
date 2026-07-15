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

| Feature             | Details                                                                                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit Tests (Vitest) | Vitest installed; full category CRUD test coverage (`getCategories`, `createCategory`, `deleteCategory`, `renameCategory`); full transaction CRUD test coverage; `getDashboardSummary` test coverage in `tests/actions/dashboard.test.ts` |
| Transactions Page   | `src/app/transactions/` — mock data removed; server actions for `getTransactions` and `createTransaction` in `src/actions/transactions.ts`; client fetches categories from server; add wired                                              |

## Complete (cont.)

| Feature             | Details                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction Actions | `getTransactions`, `createTransaction` wired; test coverage for all 4 actions in `tests/actions/transactions.test.ts`                                                                                      |
| Dashboard           | Summary cards (week income/expense, net balance, month net flow) + PieChart (expenses by category) + LineChart (cash flow with time range dropdown) + recent transactions table with link to /transactions |
| Chart Components    | `src/components/charts/PieChart.tsx`, `src/components/charts/LineChart.tsx` using Chart.js + react-chartjs-2                                                                                               |
| Dashboard Actions   | `src/actions/dashboard.ts` — `getDashboardSummary`, `getMonthlyExpensesByCategory`, `getCashFlow`, `getRecentTransactions`                                                                                 |

## Not Started

| Feature                | Details                                         |
| ---------------------- | ----------------------------------------------- |
| Integration Tests      | No test DB setup, no seeded data, no test files |
| E2E Tests (Playwright) | Not installed, no config, no test files         |
| Lib Utilities          | No formatting, validation, or helper utilities  |
