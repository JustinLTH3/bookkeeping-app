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

| Feature                  | Details                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Unit Tests (Vitest)      | Vitest installed; full category CRUD test coverage (`getCategories`, `createCategory`, `deleteCategory`, `renameCategory`) in `tests/actions/categories.test.ts` |

## Not Started

| Feature            | Details                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Dashboard          | Summary cards + bar/pie/line charts (income vs expense, by category, cumulative balance over time) |
| Transactions Page  | `src/app/transactions/` — table with date/category filters, add/edit form, CRUD operations         |
| Chart Components   | `src/components/charts/` — BarChart, PieChart, LineChart                                           |
| Server Actions     | `src/actions/` — transaction CRUD, category CRUD, dashboard aggregation queries                    |
| Unit Tests (Vitest)    | Not installed, no config, no test files                                                            |
| Integration Tests      | No test DB setup, no seeded data, no test files                                                    |
| E2E Tests (Playwright) | Not installed, no config, no test files                                                            |
| Lib Utilities          | No formatting, validation, or helper utilities                                                     |
