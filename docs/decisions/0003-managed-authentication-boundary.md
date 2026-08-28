# 0003 — Managed authentication boundary

Status: Accepted foundation; provider selection pending
Date: 2026-08-27

## Decision

Define provider-neutral server authentication and authorization boundaries before connecting a managed identity service. The application recognizes owner, manager, service advisor, technician, and bookkeeper roles and grants permissions through an explicit server-side matrix.

Until a managed provider adapter is configured, authentication fails closed. The application does not trust browser-provided role claims, create a default owner, or expose a header/cookie impersonation shortcut.

## Managed provider requirements

The selected provider must support MFA, server-side session verification, session/device revocation, secure cookie handling, audit/export capability, and separate preview/staging/production tenants or environments. Privileged roles must be MFA-enforced in production.

Provider selection is deferred because it can create recurring cost and operational lock-in. A later adapter will verify the provider identity and map it to an active internal user record; provider metadata will never be sufficient by itself to grant an application role.

## Authorization policy

- Authorization is enforced in server handlers/services, not only in navigation or prompts.
- Owner-only user and settings management remains denied to every other initial role.
- Technicians cannot access money permissions.
- Inactive internal users are denied even if the external provider session remains valid.
- Future permission changes require tests and audit events; owner/admin permission changes are not autonomous actions.

## Addendum (2026-08-27) — screens built before a provider is chosen

Phase 2 needed an owner-visible check-in screen before this ADR's provider decision is made. Rather than
add any interim shortcut this ADR forbids (dev-only login, header/cookie impersonation, a default owner),
the owner chose to build Phase 2 screens as **visual previews**: real layout and client-side interaction,
backed by illustrative/mock data, with no calls into the session-backed services from Phase 1
(`createCustomerRecord`, `createVehicleRecord`, `createJobRecord`, `universalSearch`) and no persistence.
Any action that would need a real identity (starting a check-in, saving a record) stays disabled in the UI.

This pattern should be reused for future Phase 2/3 screens built ahead of the provider decision, so no
screen accidentally implies data is being saved when it is not. Once a provider is selected and Phase 1's
`Session` can be resolved from a real request, these screens should be wired to the real services and this
addendum can be considered resolved.

## Addendum (2026-08-28) — owner selected closed-shop credentials

The owner selected individual username/password accounts for the initial closed-shop rollout. ADR 0007
documents the database-backed credentials adapter, secure session cookies, temporary lockout, and staff
bootstrap flow. This replaces the unconfigured provider for server routes without weakening the existing
role and tenant authorization checks. MFA is still required before a broader production rollout.
