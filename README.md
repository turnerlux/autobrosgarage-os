# Auto Bros OS

AI-first operating system for Auto Bros Garage.

## Product goal

Auto Bros OS should minimize repetitive human input across customer intake, vehicle records, diagnostics, estimating, approvals, repair workflow, invoicing, bookkeeping support, technician tracking, and shop organization.

Humans perform and verify physical automotive work. AI organizes information, drafts work, retrieves structured records, prepares actions, and surfaces exceptions for approval.

## Core principles

1. **One job record** follows the vehicle from check-in through payment and accounting.
2. **Database is the source of truth.** AI never acts as the permanent store for customer, vehicle, repair, financial, or service-history facts.
3. **AI-first input.** Prefer voice, photos, document parsing, autocomplete, VIN capture, and natural-language commands over repetitive forms.
4. **Human approval by risk.** Routine organization can be automatic; material financial, security, destructive, or customer-impacting actions require approval.
5. **Mobile-first shop workflow.** The app must work extremely well on phones, tablets, and desktop.
6. **Auditability.** Important changes are logged with user/agent, timestamp, old value, new value, and reason where applicable.
7. **Security by default.** Least privilege, MFA for privileged roles, protected secrets, encrypted transport/storage, and no direct storage of payment card data.

## Source documents

- `AUTO_BROS_MASTER_SPEC.md` — product and business specification
- `BACKLOG.md` — ordered development plan
- `AGENTS.md` — operating rules for coding agents
- `SECURITY.md` — security and data-handling requirements

## Development model

The owner acts as product supervisor. Coding agents may autonomously implement and test safe backlog work. Material workflow changes should be deployed to a preview environment for owner review before production. Agents should continue safe, independent work while awaiting review rather than idling.

## Initial target stack

- Next.js + TypeScript
- PostgreSQL
- Managed authentication with MFA support
- Object storage for photos/documents
- OpenAI API for AI reasoning and tool calling
- Server-side integrations only; never expose API secrets to browsers
- Preview and production environments

The exact managed providers may be chosen during implementation as long as they satisfy the master specification and security requirements.

## Local development

The application foundation uses Node.js 24 and pnpm 11. Install dependencies with `pnpm install`, then run `pnpm dev` and open `http://localhost:3000`.

Current verification commands:

- `pnpm typecheck`
- `pnpm build`

The current shell contains no real customer data, credentials, financial integrations, or production services. Provider setup will be added through the dedicated foundation backlog items.
