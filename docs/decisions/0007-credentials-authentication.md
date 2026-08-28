# 0007 — Auto Bros staff credentials

Status: Accepted by owner
Date: 2026-08-28

## Decision

Auto Bros OS will support simple staff usernames and passwords for its initial closed-shop rollout.
Turner is the owner, Arthur is the manager, and Tuan, Brennan, Ryan, Jared, and Chase are technicians.
This resolves the provider decision that kept the owner-visible screens in preview-only mode.

Passwords are never stored in plaintext or committed. They use salted scrypt hashes. Browser session
tokens are random, stored only in an HttpOnly SameSite cookie, and represented in PostgreSQL only by a
SHA-256 digest. Five failed attempts temporarily lock a credential for fifteen minutes. Internal user
records remain the source of roles and permissions; a valid password cannot grant a role by itself.

`pnpm staff:bootstrap` creates missing shop/staff records and prints one-time temporary passwords only
for credentials that did not already exist. Re-running it never resets an existing password or changes
an existing role. Privileged MFA remains a Phase 15 requirement before a broader public rollout.
