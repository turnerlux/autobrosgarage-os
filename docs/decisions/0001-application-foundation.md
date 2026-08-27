# 0001 — Application foundation

Status: Accepted
Date: 2026-08-27

## Decision

Use the Next.js App Router with strict TypeScript and React Server Components as the default. Keep the first shell dependency-light and use plain CSS until recurring UI patterns justify a component or styling dependency.

The application targets Node.js 24 LTS-compatible runtimes and uses pnpm with a committed lockfile. Provider-specific database, authentication, storage, and AI packages are intentionally deferred to their dedicated backlog items so foundation work does not create cost commitments or production credentials.

## Rationale

- The specification already selects Next.js and TypeScript.
- Server Components provide a natural server-side boundary for privileged data access.
- A minimal dependency surface reduces supply-chain and upgrade risk during foundation work.
- The responsive shell validates the target navigation, persistent AI entry point, and prominent quote action without inventing customer or financial data.

## Security and mobile review

- Framework branding headers are disabled.
- No secrets, external providers, customer data, or privileged actions are present.
- The shell includes mobile viewport metadata, safe-area-aware fixed navigation, touch targets of at least 44 pixels for primary controls, and single-column behavior on narrow phones.
- Disabled controls communicate unavailable workflows until server-side authorization and validation exist.
