# 0004 — Environment promotion strategy

Status: Accepted
Date: 2026-08-27

## Decision

Auto Bros OS uses four isolated runtime classes: local, preview, staging, and production. Builds may be promoted, but data, credentials, authentication tenants, storage namespaces, and integration webhooks must never be shared across these classes.

No production deployment is triggered automatically by a source push. Material workflow changes move through preview for owner review, then staging verification, then an explicitly approved production promotion.

## Environment boundaries

| Environment | Purpose                                   | Data policy                                             | Deployment policy                                        |
| ----------- | ----------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Local       | Developer work and automated tests        | Synthetic/disposable data only                          | Runs on a developer machine or CI runner                 |
| Preview     | Review a branch or pull request           | Isolated synthetic data; no production customer records | Automatic creation is allowed; expires with the change   |
| Staging     | Release-candidate and migration rehearsal | Sanitized fixtures or an approved protected copy        | Uses the exact release candidate intended for production |
| Production  | Live shop operations                      | Live protected records                                  | Manual approval and monitored migration required         |

## Required isolation

- Separate PostgreSQL databases and credentials per environment.
- Separate managed-authentication tenants or environment keys.
- Separate private-object-storage buckets, accounts, or enforced prefixes.
- Separate webhook signing secrets and callback URLs.
- Environment-specific encryption and API secrets stored in the deployment secret manager.
- `APP_ENV` must match the destination; promoted environments fail startup when database or authentication secrets are missing.
- Production data must not be copied into preview or local environments. Any staging copy requires authorization and documented sanitization controls.

## Promotion and rollback

1. CI verifies formatting, linting, types, tests, migration consistency, and the production build.
2. A preview is reviewed for meaningful user-facing changes.
3. Staging applies migrations against a disposable restore or staging database before production.
4. The owner approves material workflow, permission, financial, or destructive changes.
5. Production deploys the reviewed commit with an explicit migration step.
6. Application rollback uses the previous compatible build. Database migrations follow expand/contract design; destructive contraction occurs only after compatibility and backup verification.

The hosting vendor remains unselected to avoid cost and architecture lock-in. Any provider must support protected production secrets, immutable deployment history, TLS, access controls, health checks, and rollback to a prior build.
