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
- [ ] Add secure object/file storage abstraction
- [ ] Add error handling and user-safe error states
- [ ] Document local development setup

## Phase 1 — Core records

- [ ] Customer schema and CRUD
- [ ] Vehicle schema and CRUD
- [ ] Job schema and immutable human-readable job number
- [ ] Customer ↔ vehicle relationships
- [ ] Job ↔ customer ↔ vehicle relationships
- [ ] Job status model
- [ ] Technician/user assignment
- [ ] Mileage and lot-number tracking
- [ ] Record-level audit history for core changes
- [ ] Universal search across customer, phone, VIN, vehicle, lot, job number

## Phase 2 — Fast check-in

- [ ] Mobile-first check-in screen
- [ ] Returning-customer autocomplete
- [ ] Dealer rapid check-in workflow
- [ ] VIN manual entry and validation
- [ ] VIN camera/photo capture abstraction
- [ ] Natural-language complaint capture
- [ ] Optional technician assignment at intake
- [ ] Duplicate customer/vehicle detection
- [ ] Create complete Job in one fast flow

## Phase 3 — Diagnostic platform

- [ ] Diagnostic Session schema
- [ ] Findings schema with Suspected / Testing / Confirmed states
- [ ] DTC records
- [ ] Test-performed / measurement / result records
- [ ] Original technician note retention
- [ ] Customer-facing cleaned diagnostic narrative
- [ ] Photo/media attachments to findings
- [ ] Scan report/document attachments
- [ ] Diagnostic timeline/history
- [ ] Explicit confirmation control for confirmed failures

## Phase 4 — Auto Bros AI foundation

- [ ] Server-side OpenAI integration abstraction
- [ ] Persistent Auto Bros system/business instruction layer
- [ ] Tool-call registry with strict schemas
- [ ] Tool authorization middleware
- [ ] Audit logging for AI-initiated actions
- [ ] Persistent AI command bar UI
- [ ] Natural-language `find_customer`
- [ ] `create_customer`
- [ ] `find_vehicle`
- [ ] `create_vehicle`
- [ ] `create_job`
- [ ] `update_job`
- [ ] `save_diagnostic`
- [ ] `get_service_history`
- [ ] Ensure AI cannot bypass application authorization/business rules

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
- [ ] Improve partial-name/customer autocomplete
- [ ] Review all screens for unnecessary administrative input

## First safe backlog item

Codex should begin with **Phase 0 — Foundation**, specifically initializing the application, development tooling, and database/auth architecture without connecting real financial accounts or exposing production credentials.

Before making provider choices that materially lock in costs or architecture, document the recommendation and rationale. Routine technical implementation decisions may proceed autonomously.
