# Logging and audit events

Operational logs are structured JSON for diagnostics and monitoring. Audit events are durable business records for material changes. They are related but not interchangeable.

## Structured logs

- Add `shopId`, `requestId`, actor, action, and record identifiers when available.
- The logger redacts common credential fields recursively.
- Do not log customer documents, raw uploads, access tokens, full request bodies, or sensitive financial values.
- Logs may be retained by an approved observability provider later; no paid provider is connected now.

## Audit events

Every audit event requires a shop UUID so tenant ownership cannot be omitted. Events record actor, source, action, entity, timestamp, before/after values where relevant, reason, request correlation, and approval reference when required.

Audit history is append-only at the application layer. Product features must not expose update/delete operations for audit events. Any future retention or archival mechanism must preserve protected service and financial history and requires explicit policy review.
