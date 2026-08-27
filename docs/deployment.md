# Deployment environments

The environment policy is defined in `docs/decisions/0004-environment-promotion-strategy.md`.

## Runtime configuration

Set `APP_ENV` explicitly outside local development:

- Pull-request deployment: `preview`
- Shared release candidate: `staging`
- Live shop deployment: `production`

Each promoted environment requires its own `DATABASE_URL` and `AUTH_SECRET`. Storage and integration credentials become required when their adapters are enabled. Secrets belong in the hosting platform's encrypted settings, never source control or build logs.

## Release checklist

- Verify the commit passed `pnpm check`.
- Verify the destination has isolated database, authentication, storage, and webhook configuration.
- Review generated migration SQL and rehearse it outside production.
- Verify backup/restore readiness before a material schema change.
- Confirm owner approval for material workflow, permission, financial, or destructive changes.
- Smoke-test authentication, authorization, health, and primary mobile workflows after deployment.
- Preserve the prior compatible build for rollback.

No hosting provider or continuous-production deployment is configured yet.
