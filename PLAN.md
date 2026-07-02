## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Auth | Auth.js — Google OAuth |
| Database | PostgreSQL |
| ORM | Prisma |
| Charts | Chart.js + react-chartjs-2 |

## Features

- **Google SSO login** — sign in/out, protected routes via middleware
- **Dashboard** — summary cards + bar/pie/line charts (income vs expense, by category, cumulative balance over time)
- **Transactions CRUD** — table with date/category filters, add/edit form
- **Categories CRUD** — manage income and expense categories

## File Structure

```
/
├── prisma/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   │   └── new/
│   │   └── categories/
│   ├── components/
│   │   ├── charts/
│   │   └── layout/
│   ├── actions/
│   └── lib/
```

## Database Schema

### NextAuth Tables (managed by `@auth/prisma-adapter`)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| **User** | `id`, `name`, `email` (unique), `emailVerified`, `image` | Stores app user data |
| **Account** | `id`, `userId` (FK), `provider`, `providerAccountId`, `type`, `access_token`, `refresh_token`, `expires_at`, `scope`, `id_token` | Links OAuth provider to user |
| **Session** | `id`, `sessionToken` (unique), `userId` (FK), `expires` | Session management |
| **VerificationToken** | `identifier`, `token` (unique), `expires` | Composite PK on `(identifier, token)` |

### Application Tables

**Category**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | String | Not null |
| `type` | Enum (`INCOME`, `EXPENSE`) | Not null |
| `userId` | UUID | FK → User, not null |
| `createdAt` | DateTime | Default now |
| `updatedAt` | DateTime | Auto-updated |

Index: `userId + name` (unique)

**Transaction**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `amount` | Decimal(12,2) | Not null |
| `description` | String | Optional |
| `date` | DateTime | Not null |
| `type` | Enum (`INCOME`, `EXPENSE`) | Not null |
| `userId` | UUID | FK → User, not null |
| `categoryId` | UUID | FK → Category, not null |
| `createdAt` | DateTime | Default now |
| `updatedAt` | DateTime | Auto-updated |

Indexes:
- `userId + date` (composite)
- `categoryId`

### Relationship Map

```
User 1──N Account
User 1──N Session
User 1──N Category
User 1──N Transaction
Category 1──N Transaction
```

## Testing Plan

### Unit Testing

**Tool:** Vitest

**Scope:** Pure logic — no database, no browser, no network.

#### What to test

| Area | Details |
|---|---|
| **Data aggregation (dashboard)** | Totals by type (income/expense), totals by category, cumulative balance over time, date-range filtering |
| **Form validation** | Required fields, positive amounts, valid date ranges, enum constraints for transaction/category types, string length limits |
| **Filtering & sorting** | Transaction filtering by date range, by category, by type; sorting by date, by amount |
| **Formatting** | Currency display, date display, amount decimal handling |
| **Auth utilities** | Session validation, route protection logic |

#### Edge cases

- Zero / negative / extremely large / many-decimal amounts
- Future dates, dates before epoch
- Empty arrays, null/undefined inputs, missing fields
- Duplicate category names per user
- Boundary date ranges (same-day, adjacent months, year rollover)

### Integration Testing

**Tool:** Vitest + Prisma against a dedicated test PostgreSQL database

**Scope:** Server actions hitting real DB, data isolation, constraints.

#### What to test

| Area | Details |
|---|---|
| **Transactions server actions** | Create, read, update, delete — verify rows are correctly written/read/updated/removed |
| **Categories server actions** | Create, read, update, delete — verify unique constraint on (userId, name), handle category deletion when linked transactions exist |
| **Dashboard queries** | Aggregated queries return correct totals, category breakdowns, and date-filtered results matching seeded data |
| **Multi-tenancy** | User A cannot see, modify, or delete User B's data — verify userId scoping on every action |
| **Foreign key constraints** | Transaction references nonexistent category → error; User deletion cascade/restrict behavior |

#### Strategy

- Dedicated test database with `prisma migrate deploy` before suite
- Seed known data per test or per suite
- Wrap each test in a transaction + rollback, or truncate tables between tests

#### Edge cases

- Concurrent modifications (e.g., delete category while a transaction references it)
- Empty result sets for queries
- Large datasets for aggregation performance

### End-to-End Testing

**Tool:** Playwright

**Scope:** Full user journeys through the real UI against a real backend and database.

#### What to test

| Flow | Steps |
|---|---|
| **Login** | Visit app → redirected to login → click sign-in → mock OAuth → redirected to dashboard |
| **Dashboard** | Verify summary cards, charts rendered with seeded data |
| **Create transaction** | Navigate to form → fill all fields → submit → verify row appears in table |
| **Edit transaction** | Click edit → form pre-filled → modify → submit → row updates |
| **Delete transaction** | Click delete → confirm → row removed |
| **Transaction filters** | Filter by date range, by category → verify rows narrow; clear filters → all rows return |
| **Category CRUD** | Create, edit, delete categories through the UI |
| **Multi-user isolation** | Login as User A, create data, logout → login as User B → verify User A's data is invisible |
| **Error states** | Submit empty form → validation errors shown; submit invalid data → rejected; server unavailable → error message |
| **Responsive layout** | Test at mobile (320px), tablet (768px), desktop (1280px) |

#### Auth strategy

Mock the OAuth flow — either set a session cookie directly or intercept the session endpoint with Playwright route handling.

#### Edge cases

- Two tabs open, delete in one, edit in the other
- Slow network (verify loading skeletons and timeouts)
- Browser back/forward navigation through forms
- Reload after form submit (duplicate prevention)
