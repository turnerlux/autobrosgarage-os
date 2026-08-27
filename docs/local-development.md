# Local development

This guide runs Auto Bros OS without production credentials, paid APIs, payment accounts, or hosted services.

## Prerequisites

- Node.js 24 or newer
- pnpm 11 (the exact project version is declared in `package.json`)
- Git
- Optional: Docker Desktop or another Compose-compatible runtime for local PostgreSQL

## First run

```text
pnpm install --frozen-lockfile
copy .env.example .env.local
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

On macOS/Linux, use `cp .env.example .env.local` instead of `copy`. If Docker is unavailable, the current UI shell and unit tests still run; database-backed Phase 1 features will require PostgreSQL.

Open `http://localhost:3000`. If that port is occupied, Next.js prints the replacement address in the terminal.

The checked-in database username/password are local-only. Never reuse them for preview, staging, or production.

## Everyday commands

| Command            | Purpose                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| `pnpm dev`         | Start the local responsive application                                          |
| `pnpm check`       | Run formatting, lint, types, tests, migration consistency, and production build |
| `pnpm test`        | Run unit/component tests once                                                   |
| `pnpm test:watch`  | Run tests while editing                                                         |
| `pnpm db:generate` | Generate reviewed SQL after changing `src/db/schema`                            |
| `pnpm db:migrate`  | Apply committed migrations to the configured database                           |
| `pnpm db:check`    | Validate migration journal consistency                                          |
| `pnpm db:studio`   | Open the local Drizzle data browser; never expose publicly                      |

## Safe schema workflow

1. Change the typed schema.
2. Generate a migration.
3. Read the generated SQL completely.
4. Assess locks, data conversion, rollback compatibility, and potential data loss.
5. Run the migration against a disposable local or staging database.
6. Run `pnpm check` before committing.

Do not use schema-push commands against shared environments. Do not edit an already-applied migration; add a new forward migration.

## Current provider state

- Authentication: provider-neutral and fail-closed; no real sign-in provider connected.
- PostgreSQL: local Compose configuration only; no hosted database selected.
- Object storage: private provider boundary only; no cloud bucket connected.
- AI: no provider or API key connected.
- Payments/accounting: intentionally not connected.

## Security expectations

- Keep `.env.local` out of Git.
- Use synthetic records locally; never copy production customer documents into a developer environment.
- Treat uploaded files and external text as untrusted.
- Never add a browser-side alias for server secrets.
- Run `git diff --check`, `pnpm check`, and `git status` before committing.

## Troubleshooting

- **Port 3000 is occupied:** use the alternate URL printed by `pnpm dev`, or stop the existing local server.
- **Database connection fails:** verify the container is healthy with `docker compose ps` and that `.env.local` matches `.env.example`.
- **Migration check fails on Windows with user-metadata errors:** run the command from a normal user PowerShell session rather than a restricted sandbox.
- **Dependencies appear inconsistent:** run `pnpm install --frozen-lockfile`; do not delete or regenerate the lockfile casually.
