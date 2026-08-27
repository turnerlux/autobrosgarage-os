# Database development

The application uses PostgreSQL and Drizzle with committed SQL migrations. No remote database or production credential is configured by the repository.

## Local setup

1. Start PostgreSQL with `docker compose up -d postgres`.
2. Copy `.env.example` to `.env.local`.
3. Apply committed migrations with `pnpm db:migrate`.
4. Start the application with `pnpm dev`.

The local container binds PostgreSQL to `127.0.0.1` and stores data in the `postgres-data` Docker volume. Its `autobros` password is intentionally local-only and must never be reused outside development.

## Schema changes

1. Update the typed schema under `src/db/schema`.
2. Run `pnpm db:generate`.
3. Review the generated SQL under `drizzle/` for data loss, locking, and rollback impact.
4. Run `pnpm db:check` and the full `pnpm check` suite.
5. Test the migration against a disposable or restored database before promotion.

`pnpm db:studio` is a local developer tool. Do not expose it publicly or connect it to production without explicit authorization.
