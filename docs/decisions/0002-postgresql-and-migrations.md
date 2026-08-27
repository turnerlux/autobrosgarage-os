# 0002 — PostgreSQL and migrations

Status: Accepted
Date: 2026-08-27

## Decision

Use PostgreSQL with Drizzle ORM's `node-postgres` adapter and checked-in, forward-only SQL migrations. Application records use the dedicated `app` schema; Drizzle tracks applied migrations in the separate `drizzle` schema.

Local development uses an official PostgreSQL 18 Alpine container bound only to loopback. Preview, staging, and production may use any managed PostgreSQL provider that supports encrypted connections, backups, point-in-time recovery, and separate databases per environment. No hosted provider is selected yet.

## Rationale

- PostgreSQL is required by the product specification.
- Checked-in SQL keeps schema changes reviewable and preserves rollback planning.
- Drizzle provides typed queries without hiding the generated SQL or coupling deployment to a specific database vendor.
- A dedicated application schema avoids collisions with provider extensions and migration metadata.

## Migration policy

- Generate migrations with `pnpm db:generate`; do not use schema push in shared environments.
- Review generated SQL before committing it.
- Apply migrations with `pnpm db:migrate` during an explicit deployment step.
- Prefer additive, backwards-compatible migrations. Every destructive or large-table change requires a documented impact assessment and rollback/data-preservation plan.
- Production credentials belong only in the deployment secret manager. The local credentials in `compose.yaml` are development-only.
