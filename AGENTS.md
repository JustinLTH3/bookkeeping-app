<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Documentation

- [`PLAN.md`](./PLAN.md) — Reference only. Do **not** modify this file. Architecture, tech stack, feature plan, database schema, testing plan.
- [`PROGRESS.md`](./PROGRESS.md) — Active tracker. Update this file as features are implemented.
- AGENTS.md — This file.

## Notes

- Always update `PROGRESS.md` after each feature is implemented.
- If updates are needed for tech stack or features, only update `PLAN.md` when explicitly requested.
- Read the relevant Next.js guide in `node_modules/next/dist/docs/` before writing code — this project uses Next.js 16 with breaking changes.
- Use `npm run lint` to lint the project.
- Use `npm run dev` to start the development server.
- Use `npm test` for unit tests (no database required).
- Use `npm run test:integration` for DB-backed integration tests — requires the test database: `docker compose up -d` (postgres:16 on port 5433, or set `TEST_DATABASE_URL`). Migrations are applied automatically by the Vitest global setup. The suite includes 50k-row scale tests; set `SCALE_ROWS` to change the row count.
- Never commit unless explicitly requested.
- Always wrap test names in quotes when running with Vitest: `npx vitest run "test name"`
