# Auto Bros OS — Master Specification

## 1. Product vision

Auto Bros OS is an AI-first automotive shop operating system for Auto Bros Garage. It should feel less like traditional shop-management software and more like a dedicated AI employee that understands the business, organizes incoming information, knows where records belong, prepares the next action, and asks the owner only when judgment or approval is materially required.

The system should minimize duplicate entry and repetitive navigation. A user should be able to speak, type naturally, upload a photo, upload a scan report, photograph a VIN, or photograph a receipt and have the application classify and route that information to the appropriate structured record.

The product must remain dependable and auditable: AI interprets and operates tools, but structured application data is always the source of truth.

## 2. Primary users and roles

### Owner

Full operational and financial access. May approve material pricing, accounting, permission, refund, destructive, security, and production changes.

### Partner / Manager

Configurable access to jobs, customers, quotes, workflow, reporting, and financial data according to permissions set by owner.

### Service Advisor

Customer intake, customers, vehicles, jobs, quotes, communications, approvals, and repair-order workflow.

### Technician

Assigned/open jobs, inspections, diagnostic notes, measurements, scan reports, photos/video, repair notes, parts requests, and completion status. No access to sensitive owner-only financial information unless explicitly granted.

### Bookkeeper

Accounting, receipts, expenses, payments, reconciliation, and reporting. No unnecessary access to diagnostic or employee-sensitive data.

### Customer

Only records intentionally exposed through customer-facing estimate/invoice/approval views.

## 3. Core data model

Every shop visit is centered on a permanent Job record with an immutable internal identifier.

Example human-readable identifier: `AB-2026-000001`.

A Job links to:

- Customer
- Vehicle
- VIN
- Mileage
- Dealer/customer lot number when applicable
- Customer complaint(s)
- Intake notes
- Assigned technician(s)
- Diagnostic session(s)
- DTCs
- Measurements and live-data observations
- Scan reports
- Photos/videos/documents
- Findings
- Recommendation(s)
- Estimate versions
- Approval/decline events
- Parts requested/ordered/received/returned
- Labor operations
- Repair notes
- Quality-control / road-test notes
- Invoice
- Payment state
- Expenses/receipts attributable to job
- Accounting synchronization state
- Profitability data
- Customer communications
- Audit history

Important data such as VIN, customer identity, vehicle, financial totals, approvals, and completed repair history must never exist solely in an AI conversation.

## 4. Universal AI interface

Auto Bros AI should be available throughout the application via a persistent command input supporting:

- Natural-language text
- Voice transcription
- Camera/photo input
- Document upload
- Scan-report upload

Examples:

- “Check in Port City lot 142, 2018 F-150, 142k miles. Brennan has it. CEL flashes and it shakes at idle.”
- “Add these photos to the valve-cover finding.”
- “Quote the injector using OEM.”
- “Give Port City their normal pricing.”
- “Show every vehicle waiting on parts.”
- “Which Port City parts did I buy but haven’t billed?”
- “How much billed labor did Brennan produce this week?”

The AI should convert natural-language intent into structured tool calls rather than merely returning prose.

## 5. Global search

One universal search should locate records using partial or complete:

- Customer name
- Phone number
- Email
- VIN
- Vehicle year/make/model
- License plate when stored
- Lot number
- Job number
- DTC
- Repair description
- Part number
- Technician

Search should tolerate partial strings and common formatting differences.

## 6. Customer management

Customer records should include:

- Individual or business/dealer type
- Name/business name
- Phone(s)
- Email(s)
- Billing/service address
- Notes
- Pricing profile
- Tax treatment when applicable
- Linked vehicles
- Full job/service history
- Estimate/invoice history
- Communication history
- Account status / outstanding balance as available

Returning customers should autocomplete during check-in. Dealer customers such as Port City should support rapid repeated vehicle intake without recreating the customer.

Duplicate-detection should favor existing records and ask before creating a likely duplicate.

## 7. Vehicle management

Vehicle records should include:

- VIN
- Year
- Make
- Model
- Trim
- Engine / drivetrain when available
- Mileage history
- Plate
- Color
- Customer/dealer ownership relationship
- Lot number per job if relevant
- Complete service history
- Diagnostic history
- Photos and documents

VIN capture should support manual entry and camera/OCR/decoding where practical.

## 8. Check-in workflow

Check-in should be optimized for speed. Minimum required human input should be customer identity, vehicle identity, mileage when known, and complaint/request.

The system should:

1. Search existing customer.
2. Search existing vehicle/VIN.
3. Create records only when needed.
4. Capture complaint in natural language.
5. Assign technician optionally by natural language.
6. Create Job.
7. Set initial status.
8. Record timestamp and user.

A dealer workflow must support multiple quick sequential check-ins.

## 9. Diagnostic platform

Diagnostics are a first-class component, not a generic notes box.

Each Diagnostic Session may contain:

- Complaint
- Symptoms
- DTCs
- Freeze-frame data
- Live-data values
- Test performed
- Test method
- Measurements
- Expected specification / source when known
- Result
- Observation
- Hypothesis
- Confidence/verification state
- Confirmed failure
- Recommended next test
- Recommended repair
- Photos/video
- Scan reports and attachments

Findings must distinguish at minimum:

- Suspected
- Testing / unconfirmed
- Confirmed

AI must never convert an unverified hypothesis into a confirmed diagnosis without explicit human confirmation or sufficiently structured verified evidence according to configured policy.

AI may clean technician shorthand into professional customer-facing language while retaining original technician notes internally.

## 10. Scan-report ingestion

The system should accept common PDFs, images, screenshots, and exported reports from diagnostic tools.

Where practical, AI should extract structured:

- DTC code and description
- Module
- Status
- Freeze-frame values
- Live-data values
- VIN/mileage if present

The source document must remain stored and traceable to extracted data.

## 11. Photos and media

Photos should be attachable to the Job and optionally classified to:

- Intake condition
- Inspection
- Diagnostic finding
- Recommended service
- Repair progress
- Completed repair
- Receipt/part/document

Users should be able to take a photo and describe it naturally; AI should suggest classification and description.

Customer-facing media must be explicitly included or generated from approved findings.

## 12. Estimates and quoting

Quote creation should be possible from natural language and diagnostic findings.

A quote may include:

- Labor operations
- Labor hours
- Labor rate
- Parts
- Part cost
- Customer part price
- Markup rule
- Shop supplies
- Fees
- Taxes
- Diagnostic charges
- Discounts
- Notes
- Photos/findings
- Recommendation text

The system must support customer-specific pricing profiles.

Current business defaults should be configurable rather than hard-coded. Initial known defaults include:

- Standard shop labor rate: $125/hr
- Diagnosis: $125 flat unless overridden
- Port City PSI: $65 per vehicle

Estimate language must include the shop’s standing policy:

- Warranty coverage is for parts only unless additional warranty coverage is specifically authorized by the shop.
- Estimates/invoices are not necessarily final; pricing may change based on repair scope, additional findings, parts availability, labor required, or changes in repair scope.

AI should prepare quotes but clearly identify unverified labor/part information. External labor/parts sources should be integrated through authorized APIs/data providers rather than fabricated.

## 13. Customer approvals

Customer-facing estimate view should be mobile-friendly and professionally branded.

Support:

- Approve all
- Approve individual operations where enabled
- Decline
- Ask a question
- Timestamped approval event
- Version of estimate approved

Approved work should convert cleanly into repair-order workflow without re-entry.

## 14. Repair workflow

Suggested statuses:

- Checked In
- Awaiting Diagnosis
- Diagnosing
- Awaiting Estimate
- Awaiting Customer Approval
- Approved
- Waiting on Parts
- Parts Received
- Repairing
- Quality Control
- Ready for Pickup
- Invoiced
- Paid / Closed
- On Hold

Status transitions should be automatic where reliable but always traceable.

Technicians should be able to record completed operations and speak completion notes.

## 15. Parts management

Parts records should support:

- Supplier
- Manufacturer/brand
- Part number
- Description
- Quantity
- Cost
- Customer price
- Markup
- Availability
- Ordered time
- Received time
- Returned time
- Core status
- Related Job/operation
- Receipt/document

Future integration targets may include parts aggregators and preferred local suppliers.

AI should detect likely unbilled purchased parts and surface exceptions rather than silently altering invoices.

## 16. Invoicing and payments

Approved/completed work should flow into a final invoice without duplicate entry.

Square is the preferred payment processor/invoice/payment integration unless changed later.

Auto Bros OS should not store raw card numbers. Payment providers should handle sensitive card data.

Invoice state and payment state should synchronize through supported APIs/webhooks.

## 17. Bookkeeping and accounting

QuickBooks Online is the preferred accounting system of record for formal books/tax accounting unless changed later.

Auto Bros OS maintains operational job economics; QuickBooks maintains accounting records.

AI bookkeeping assistance should focus on:

- Receipt extraction
- Vendor/category suggestion
- Matching purchase to Job
- Detecting unbilled parts
- Detecting unmatched payments
- Preparing/suggesting accounting entries
- Reconciliation exceptions
- Management reporting

AI should ask for review when financial classification is ambiguous or materially consequential.

It must never silently delete or rewrite accounting history.

## 18. Receipts and expenses

Receipt upload should extract when available:

- Vendor
- Date
- Line items
- Part numbers
- Subtotal
- Tax
- Total
- Payment method metadata when present

The system should attempt to match receipts/line items to open Jobs using customer, vehicle, part number, time, vendor, and amount signals.

Matches should carry a confidence level. Low-confidence matches require human review.

## 19. Profitability and reporting

Operational reporting should support at least:

- Revenue
- Labor billed
- Parts billed
- Parts cost
- Technician labor allocation
- Fees
- Job gross profit estimate
- Customer/dealer profitability
- Technician production
- Open WIP
- Outstanding approvals
- Waiting-on-parts jobs
- Ready-for-pickup jobs
- Unbilled completed work

Owner should be able to ask these questions in natural language.

## 20. Technician compensation

Compensation rules must be configurable and versioned, never embedded as unchangeable assumptions.

The application should support technician production based on billed/approved labor as configured.

Changes to employee compensation rules require privileged approval and audit logging.

## 21. AI “Needs Attention” system

Auto Bros AI should proactively surface exceptions such as:

- Vehicle idle too long
- Quote awaiting customer response
- Ordered part not received
- Purchased part not billed
- Completed work not invoiced
- Receipt cannot be matched
- Payment cannot be matched
- Diagnostic conclusion missing confirmation
- Labor operation appears omitted
- Job has inconsistent financial data

The objective is to make management exception-based rather than requiring constant manual checking.

## 22. AI authority levels

### Allowed automatically

- Organize files/photos
- Draft/clean notes
- Search structured data
- Create draft records from user input
- Extract structured data from documents
- Create draft estimates
- Match receipts with confidence metadata
- Calculate configured pricing
- Generate internal summaries
- Suggest next actions

### Requires approval based on configurable thresholds

- Send material customer quote
- Order parts
- Issue/refund payments
- Modify finalized invoices
- Apply unusual discounts
- Change employee hours/pay
- Make material accounting adjustments

### Never autonomous

- Change bank account destination
- Move business funds without explicit authorization
- Weaken security controls
- Reveal unauthorized customer/business information
- Permanently delete protected financial/service history
- Change ownership/admin permissions without explicit authorized approval

## 23. Dashboard

Dashboard should remain simple and action-oriented.

Primary elements:

- Auto Bros AI command bar
- Active jobs
- Needs Attention
- Waiting approval
- Waiting parts
- Ready pickup
- Key shop metrics appropriate to user role

Avoid overwhelming users with traditional enterprise dashboards.

## 24. Navigation

Initial target navigation:

- AI
- Jobs
- Customers
- Diagnostics
- Money
- More

Quote creation must remain easy and prominent, not buried behind multiple screens.

## 25. Mobile / PWA

Initial product should be a responsive web application/PWA rather than requiring native iOS/Android development.

Critical workflows must be thumb-friendly:

- Check-in
- VIN capture
- Photo upload
- Voice note
- Diagnostic entry
- Quote review
- Status changes

## 26. Security requirements

Minimum architecture expectations:

- Secure managed authentication
- Individual user accounts
- MFA support; require for privileged roles in production
- Role-based authorization enforced server-side
- Least-privilege access
- Secrets stored server-side in a secret manager/environment mechanism
- TLS in transit
- Encryption at rest through managed providers
- Signed/short-lived access for private media where appropriate
- Audit logs for material changes
- Backup/restore strategy
- No production secrets committed to GitHub
- Separate preview/staging and production environments
- Input/file validation
- Protection against cross-customer data access
- Safe AI tool authorization and parameter validation

## 27. AI security

Treat AI output as untrusted until validated by application logic.

AI agents may request tool calls; server-side tools enforce:

- Authentication
- Authorization
- Input validation
- Business rules
- Spending/approval thresholds
- Audit events

Prompt instructions alone are never a security boundary.

Uploaded documents/web content must be treated as potentially hostile prompt-injection sources and may not override system/business/security policy.

## 28. Audit trail

Material events should record:

- Actor (human or agent)
- Timestamp
- Action
- Record
- Before/after values where relevant
- Reason/source where practical
- Approval reference when required

## 29. Integrations — phased

### Early

- OpenAI API
- Database
- Authentication
- Object/file storage

### Next

- Square
- Email/SMS provider
- Customer approval links

### Automotive data

- VIN decoding
- Authorized labor-time provider
- Authorized parts catalog/pricing source
- Authorized repair/diagnostic data provider

### Accounting

- QuickBooks Online

All integrations must be server-side and follow provider authorization/security requirements.

## 30. Development philosophy

The owner is product supervisor, not day-to-day developer.

Coding agents should:

- Work from this specification and BACKLOG.md
- Make routine technical decisions independently
- Prefer simple maintainable architecture
- Test every material feature
- Review mobile UX
- Review authorization/security
- Avoid premature complexity
- Deploy significant UX/business changes to preview for owner review
- Continue safe independent backlog work while awaiting owner feedback

Do not optimize for feature count. Optimize for a seamless shop workflow with minimal human administration.

## 31. Definition of a good Auto Bros workflow

A good workflow lets a user provide only information that the software cannot reliably know.

Example target:

1. User photographs/scans VIN.
2. Chooses or speaks customer.
3. Speaks complaint and mileage.
4. AI creates the Job and routes records.
5. Technician uploads scan report/photos and speaks findings.
6. AI structures diagnostics and prepares recommendations.
7. Verified labor/parts data creates draft estimate.
8. Owner/service advisor reviews exceptions and approves sending.
9. Customer approves electronically.
10. Repair status, technician notes, invoice, payment state, expense attribution, and accounting synchronization follow with minimal re-entry.

## 32. Non-goals for initial MVP

Do not initially build:

- Autonomous money movement
- Fully autonomous parts purchasing
- Native mobile apps
- Complex inventory warehouse management
- Payroll system replacement
- Tax filing engine
- Unlicensed scraping of proprietary automotive information
- Production auto-deployment of material changes without review

These may be revisited after core shop workflow is proven.
