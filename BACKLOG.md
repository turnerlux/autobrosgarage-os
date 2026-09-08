# Auto Bros OS — Development Backlog

Work top-down unless a dependency requires otherwise. Significant UX/business changes go to preview for owner review before production.

## Phase 0 — Foundation

- [x] Initialize Next.js + TypeScript application
- [x] Add linting, formatting, unit test framework, and basic CI
- [x] Configure environment variable validation
- [x] Establish PostgreSQL database and migrations
- [x] Add managed authentication foundation with role support
- [x] Define preview/staging and production environment strategy
- [x] Add structured logging and audit-event framework
- [x] Add secure object/file storage abstraction
- [x] Add error handling and user-safe error states
- [x] Document local development setup

## Phase 1 — Core records

- [x] Customer schema and CRUD
- [x] Vehicle schema and CRUD
- [x] Job schema and immutable human-readable job number
- [x] Customer ↔ vehicle relationships
- [x] Job ↔ customer ↔ vehicle relationships
- [x] Job status model
- [x] Technician/user assignment
- [x] Mileage and lot-number tracking
- [x] Record-level audit history for core changes
- [x] Universal search across customer, phone, VIN, vehicle, lot, job number

Delivered as data/service-layer modules (`src/customers`, `src/vehicles`, `src/jobs`,
`src/search`, `src/tenancy`, `src/users`) with full multi-tenant isolation and audit
logging. No UI screens yet — that begins in Phase 2 (Fast check-in), which will be the
first owner-visible/previewable surface. See `docs/decisions/0005-multi-tenant-core-records.md`.

## Phase 2 — Fast check-in

- [x] Mobile-first check-in screen (`/check-in`) — saves complete live records
- [x] Returning-customer autocomplete — real shop-scoped partial name/phone search
- [x] Dealer rapid check-in workflow — mode toggle changes fields (account name, PO/RO #, drops email)
- [x] VIN manual entry and validation — reuses the exact VIN regex from `src/vehicles/model.ts`
- [x] VIN camera/photo capture abstraction — disabled "Scan VIN" button, matches the Phase 0 pattern
- [x] Natural-language complaint capture — free-text field, no AI processing yet (Phase 4)
- [x] Optional technician assignment at intake — active technician accounts from the staff table
- [x] Duplicate customer/vehicle detection — live VIN/customer ownership check with a server-side backstop
- [x] Shop / dealership-site / mobile work location captured at intake
- [x] Create complete Job in one fast flow — transactional customer, vehicle, and job save

**2026-08-28 completion:** the credential/session adapter from ADR 0007 now protects live check-in APIs.
The screen searches real customers and VINs, loads the active technician roster, and saves the customer,
vehicle, and permanent Job in one database transaction. Dealer rapid entry retains the chosen account for
the next vehicle. Work is classified as shop, dealership-site, or mobile at intake. See ADR 0008.

## Phase 3 — Diagnostic platform

- [x] Diagnostic Session schema
- [x] Findings schema with Suspected / Testing / Confirmed states
- [x] DTC records
- [x] Test-performed / measurement / result records
- [x] Original technician note retention
- [ ] Customer-facing cleaned diagnostic narrative — the human-editable field and setter
      exist (`setCustomerFacingSummary`), but nothing drafts it automatically yet; AI-assisted
      drafting is Phase 4's job
- [x] Photo/media attachments to findings
- [x] Scan report/document attachments
- [x] Diagnostic timeline/history
- [x] Explicit confirmation control for confirmed failures

Delivered as data/service-layer modules (`src/diagnostics`, plus a `listForEntities`
extension to `src/audit/store.ts`) with the same multi-tenant isolation, permission
checks, and audit logging as Phase 1. See
`docs/decisions/0003-managed-authentication-boundary.md` addendum for why diagnostics
write paths still need a real `Session` before any UI can call them end-to-end.

A preview-only `/diagnostics` screen (`src/app/diagnostics/page.tsx`) now exists, built
the same way as the Phase 2 check-in screen: fully interactive against local component
state with illustrative mock jobs, so the owner can exercise the whole intended
workflow — open/close a session, log findings, move them through Suspected → Testing,
record and link DTCs, log tests, and read the resulting timeline — with nothing
persisted and no calls to the real `src/diagnostics` backend yet. It reuses the
backend's own `dtcCodePattern` and `settableFindingStatuses` exports so the preview's
validation and status rules can't drift from the service layer. Confirming a finding is
its own dedicated button, separate from the routine status buttons, to visually carry
forward the backend's "explicit confirmation control" design. Camera and scan-report
upload buttons are present but permanently disabled, matching Phase 2's disabled-"Scan
VIN"-button pattern. Wiring this screen to the real backend is blocked on the same
sign-in provider decision as check-in (ADR 0003).

A finding only reaches `confirmed` through the dedicated `confirmFindingRecord` service
function (never through the generic status-update path), which always records who
confirmed it and always emits its own audit event — the "explicit confirmation control"
item specifically asked for that failure mode to be deliberate and attributable, not an
incidental side effect of a routine status change.

The diagnostic timeline reuses the existing audit-event log (`AuditStore.listForEntities`)
across a session and everything under it — findings, DTCs, tests, attachments — rather
than a bespoke history table, since every mutation already writes an audit event.

## Phase 4 — Auto Bros AI foundation

- [x] Server-side OpenAI integration abstraction — provider-neutral interface
      (`src/ai/provider.ts`) plus a fail-closed `UnconfiguredAiModelProvider`, the same
      pattern as `src/auth/provider.ts`. No real OpenAI (or any other) connection exists
      yet; connecting one is a paid-provider decision reserved for the owner — see
      `docs/decisions/0006-ai-model-provider-boundary.md`.
- [x] Persistent Auto Bros system/business instruction layer — `src/business-settings/`,
      a versioned, per-shop, database-backed record of labor rate, diagnosis fee, and
      policy text (seeded from `AUTO_BROS_MASTER_SPEC.md` section 12 defaults), read-gated
      on `estimates:read` and write-gated on owner-only `settings:manage`, audit-logged on
      every change.
- [x] Tool-call registry with strict schemas — `src/ai/tools/registry.ts`, `zod`-validated
      arguments, one entry point (`ToolRegistry.invoke`) every tool call goes through.
- [x] Tool authorization middleware — the registry calls the exact same `requirePermission`
      matrix every human-facing route uses; a role that cannot do something through the UI
      cannot do it through a tool call either.
- [x] Audit logging for AI-initiated actions — every invoke attempt (success, permission
      denial, invalid arguments, or handler failure) writes an `ai_tool.*` audit event
      (`actorType: "agent"`, `source: "ai_tool"`, both pre-existing enum values) alongside
      whatever domain audit event the underlying service writes.
- [x] Persistent AI command bar UI — `src/app/ai/page.tsx`, a visual preview screen (no
      live provider, no real tool execution) following the same ADR 0003 pattern as
      check-in and diagnostics. Lets the owner try example commands (each mapped to the
      real registered tool it would call) and ask free-form questions; every reply is
      canned locally, not generated, and the real `createAiToolRegistry()` / tool handlers
      are never invoked. Also lists all 8 currently-registered tools with their required
      permission, copied verbatim from `src/ai/tools/definitions.ts` so the preview can't
      quietly drift from what the AI can actually do. Home page's "AI" nav item now links
      here (previously an inert anchor). This was the last unchecked Phase 4 item.
- [x] Natural-language `find_customer` — `src/ai/tools/definitions.ts`
- [x] `create_customer`
- [x] `find_vehicle`
- [x] `create_vehicle` — wraps `createVehicleRecord`; returns the existing vehicle instead of a
      duplicate when the VIN already matches one on file, same de-duplication behavior as the
      check-in screen's mock duplicate-detection preview
- [x] `create_job` — wraps `createJobRecord`; generates a real shop job number, requires an
      existing customer and vehicle in the same shop
- [x] `update_job` — wraps `updateJobStatus` and/or `assignTechnician`; status changes are still
      validated by the job board's own allowed-transition rules, so an AI-requested transition
      that a human couldn't make on the job board is rejected the same way
- [x] `save_diagnostic` — implemented as `save_diagnostic_finding`, wraps `addFindingRecord`;
      can only ever create a `suspected` finding, never a confirmed one
- [x] `get_service_history` — new `getVehicleServiceHistory` service function plus a
      `listByVehicle` addition to `JobStore`
- [x] Ensure AI cannot bypass application authorization/business rules — every tool handler
      calls into the real Phase 1/3 service function rather than touching stores directly,
      so the same permission checks, tenant checks, and validation a human action would go
      through apply identically to an AI-initiated one; proven by tests (e.g. a technician
      session is denied `create_customer` through the tool exactly as it would be through
      the web route).

No real AI model provider is connected. Nothing in this phase calls out to, or requires
credentials for, any external AI service — see `docs/decisions/0006-ai-model-provider-boundary.md`
for what is deferred to the owner and why.

## Phase 5 — Files, photos, and scan ingestion

- [ ] Camera upload workflow optimized for mobile
- [ ] Private media permissions
- [ ] AI-assisted photo classification
- [ ] Natural-language photo attachment to Job/finding
- [ ] PDF/image scan-report ingestion
- [ ] Extract DTC/module/status data with source traceability
- [ ] Extract useful live-data/freeze-frame values where reliable
- [ ] Preserve original source document
- [ ] Receipt/document type detection

## Phase 6 — Quote builder

- [ ] Estimate schema with immutable version history
- [ ] Labor operation lines
- [ ] Parts lines
- [ ] Fees, shop supplies, tax, discounts
- [ ] Customer pricing profiles
- [ ] Configurable default labor/diagnostic pricing
- [ ] Parts-only warranty disclaimer
- [ ] Non-final / subject-to-change pricing disclaimer
- [ ] Quote from diagnostic recommendation
- [ ] Natural-language quote edits
- [ ] Profit/margin preview for authorized users
- [ ] Professional branded PDF generation
- [ ] Prominent Create Quote action in UI

## Phase 7 — Customer approval workflow

- [ ] Secure customer estimate link
- [ ] Mobile customer estimate UI
- [ ] Approve all
- [ ] Selective line-item approval where configured
- [ ] Decline
- [ ] Ask-question workflow
- [ ] Record exact estimate version approved
- [ ] Timestamp/IP/session metadata as appropriate
- [ ] Convert approved estimate to repair workflow without re-entry

## Phase 8 — Repair workflow

**Brought forward (ADR 0009):** a read-only job board now exists at `/jobs` — every job in the
shop, newest first, searchable by job number, customer, vehicle, plate, or complaint, defaulting
to open work. Until this landed the application was write-only: a job could be checked in and
then never seen again from inside the app. Status _changes_ from the board are still Phase 8;
`updateJobStatus` and its transition rules already exist and are tested.

- [ ] Status automation and manual override
- [ ] Waiting-on-parts tracking
- [ ] Parts received status
- [ ] Technician completion notes
- [ ] Voice-to-completion-note workflow
- [ ] Quality control / road-test entry
- [ ] Ready-for-pickup state
- [ ] Completed-work consistency checks
- [ ] Surface missing labor/parts before invoicing

## Phase 9 — Parts and external automotive data

- [ ] Define provider interfaces for VIN/labor/parts/repair data
- [ ] Integrate authorized VIN decoder
- [ ] Integrate licensed labor-time provider
- [ ] Integrate licensed parts pricing/catalog provider
- [ ] Mark source and freshness of external data
- [ ] Prevent AI from inventing unverified labor/part values
- [ ] Parts order/request state model
- [ ] Supplier/part number/cost/customer-price tracking
- [ ] Return/core tracking

## Phase 10 — Invoices and Square

- [ ] Invoice schema derived from approved/completed work
- [ ] Final invoice review
- [ ] Square customer/payment integration
- [ ] Payment links/invoices through supported Square APIs
- [ ] Payment webhook handling
- [ ] Payment state synchronization
- [ ] No raw payment-card storage
- [ ] Refund workflow requiring configured approval

## Phase 11 — Expenses and receipt AI

- [ ] Expense schema
- [ ] Receipt upload/camera flow
- [ ] Extract vendor/date/amount/tax/line items
- [ ] Match receipt items to Jobs
- [ ] Confidence score + review queue
- [ ] Detect likely unbilled parts
- [ ] Detect unmatched purchases
- [ ] Vendor history

## Phase 12 — QuickBooks Online

- [ ] OAuth integration architecture
- [ ] Customer/vendor mapping strategy
- [ ] Invoice/payment synchronization design
- [ ] Expense/accounting-entry preparation
- [ ] Reconciliation exception queue
- [ ] Sync status/error handling
- [ ] Never silently rewrite historical accounting data
- [ ] Owner/bookkeeper review controls for ambiguous material entries

## Phase 13 — Money / profitability

- [ ] Job profitability model
- [ ] Labor billed
- [ ] Parts billed
- [ ] Parts cost
- [ ] Technician labor allocation
- [ ] Fees
- [ ] Estimated gross profit
- [ ] Customer/dealer profitability
- [ ] Technician production
- [ ] WIP reporting
- [ ] Outstanding/unbilled work
- [ ] Natural-language owner reporting

## Phase 14 — Needs Attention / operations AI

- [ ] Stalled vehicle detection
- [ ] Awaiting-approval follow-up detection
- [ ] Waiting-on-parts exception detection
- [ ] Completed-not-invoiced detection
- [ ] Purchased-not-billed detection
- [ ] Unmatched payment/receipt detection
- [ ] Missing diagnostic confirmation detection
- [ ] Possible missing labor detection
- [ ] Role-specific Needs Attention dashboard
- [ ] AI summary of daily operational priorities

## Phase 15 — Security hardening

**Partially addressed (ADR 0009):** the staff roster is no longer committed. It moved from a
hard-coded array in `scripts/bootstrap-staff.mjs` to a git-ignored `scripts/staff.json`, so a
public repository no longer publishes every valid username, each person's privilege level, or
employees' names. Passwords were never exposed — they are generated at runtime and stored only
as scrypt hashes.

**Still open, and the most urgent item in this phase:** lockout is per username, so five failed
attempts lock that account for 15 minutes. Anyone who learns a username can lock real staff out
of a working shop, repeatedly. Removing the public roster raises the cost of that attack without
removing it. The fix is per-IP throttling that an unauthenticated attacker cannot use to lock a
known-good account — tracked under "Rate limiting" below.

- [ ] MFA requirement for privileged roles
- [ ] Comprehensive role/permission tests
- [ ] Cross-customer access tests
- [ ] File upload validation
- [ ] Prompt-injection resistant document processing design
- [ ] Tool-call authorization tests
- [ ] Rate limiting
- [ ] Session/device revocation strategy
- [ ] Backup/restore verification
- [ ] Security headers and CSP
- [ ] Dependency/security scanning
- [ ] Threat model and remediation review

## Phase 16 — UX simplification pass

- [ ] Measure clicks/taps for core workflows
- [ ] Remove duplicate fields and navigation
- [ ] Ensure AI command bar can perform common workflows
- [ ] Validate mobile usage with one-handed technician flows
- [ ] Simplify dashboard
- [ ] Verify Create Quote remains immediately discoverable
- [x] Improve partial-name/customer autocomplete
- [x] Returning-customer vehicle picker — selecting a saved customer now lists the vehicles
      already on file for them, so a repeat visit reuses the record instead of re-typing a VIN
      (`listCustomerVehicles`; see ADR 0009)
- [ ] Review all screens for unnecessary administrative input

## First safe backlog item

Codex should begin with **Phase 0 — Foundation**, specifically initializing the application, development tooling, and database/auth architecture without connecting real financial accounts or exposing production credentials.

Before making provider choices that materially lock in costs or architecture, document the recommendation and rationale. Routine technical implementation decisions may proceed autonomously.
