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
