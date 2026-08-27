# 0006 — AI model provider boundary

Status: Accepted foundation; provider selection pending
Date: 2026-08-27

## Decision

Define a provider-neutral AI completion boundary, a persistent business-instruction layer,
and a permission-checked, audit-logged tool-call registry _before_ connecting any paid AI
model provider (e.g. OpenAI, as named in the Phase 4 backlog). This mirrors ADR 0003: build
the architecture the rest of the system depends on now, and defer the decision that creates
recurring cost and vendor lock-in to the owner.

Until a provider adapter is configured, `UnconfiguredAiModelProvider` fails closed --
`AiModelProviderNotConfiguredError` on every call. There is no default vendor, no simulated
response, and no local model fallback: an unconfigured AI feature must be visibly disabled,
never silently degraded.

## Why this can be built without owner approval

`docs/decisions/0003-managed-authentication-boundary.md`'s addendum established the pattern:
build the parts of a feature that do not require a live paid connection, and hold the
connection itself for the owner. Everything shipped in this ADR is testable end-to-end with
an in-memory provider double and never calls, or requires credentials for, any external AI
service:

- `src/ai/provider.ts` -- the `AiModelProvider` interface and its unconfigured stub.
- `src/business-settings/` -- a versioned, audited, per-shop record of the business rules
  (labor rate, diagnosis fee, warranty language) an AI system prompt would need, so those
  facts live in the database and not in a prompt template or the model's own memory.
- `src/ai/tools/registry.ts` and `src/ai/tools/definitions.ts` -- a tool-call registry that
  validates arguments with `zod`, enforces the exact same `requirePermission` matrix as
  every human-facing route, and writes an audit event for every attempt (success, denial,
  and failure). Five tools are wired to real, already-tested Phase 1/3 services as a proof
  of the pattern: `find_customer`, `find_vehicle`, `get_service_history`,
  `create_customer`, and `save_diagnostic_finding`.

None of this requires choosing or paying for a model provider. It becomes useful the moment
one is connected, and is fully exercised by tests today with a fake provider and fake tool
calls.

## What still requires owner approval

**Connecting a real, paid AI model provider is a new paid external provider with
meaningful recurring cost**, exactly the category the owner reserved for themselves. This
ADR does not connect one, and no code path in this repository calls out to a live AI
service. When the owner is ready to decide:

- **Recommendation: OpenAI**, since the master specification and Phase 4 backlog already
  name it as the intended integration target, and it has first-class support for structured
  tool-calling, which this registry is designed around. This is a recommendation, not a
  connection -- the owner should confirm before any API key is requested or billed.
- A provider adapter (e.g. `OpenAiModelProvider implements AiModelProvider`) can be added
  without changing any other file in `src/ai/` -- the interface is the seam.
- Required before going live with a real provider: a rate/cost cap, a clear policy on what
  customer and business data is ever included in a prompt, and a decision on which tools
  (beyond the five read/write examples above) actually ship, given the authority-level
  rules below.

## How AI authority levels map onto this system

Per `AUTO_BROS_MASTER_SPEC.md` section 22, tool calls fall into three tiers. This
architecture enforces the boundary structurally, not by asking the model to behave:

- **Allowed automatically** (e.g. search, draft creation, summaries): implemented as tools
  gated by the same `*:read` / `*:write` permission a human would need for the same action.
  A technician session, for example, has no `customers:write`, so `create_customer` is
  denied for it exactly as it would be through the web UI -- not because the AI "chooses"
  not to call it.
- **Requires approval / thresholds** (send a quote, order parts, refund, unusual
  discount): no tool for any of these exists yet. They are Phase 5/6 work and must ship
  with an explicit approval step, not just a permission check.
- **Never autonomous** (change banking destination, weaken security, reveal unauthorized
  data, permanently delete protected history, change ownership/admin permissions): no tool
  exists for any of these, and none should ever be added to this registry. `requireSameShop`
  and the role/permission matrix remain the enforcement mechanism, independent of anything
  a model "decides."

## Audit design

A tool call always executes inside a real human's authenticated `Session` -- the AI has no
identity or session of its own, and cannot act outside the permissions of whoever's session
invoked it. Domain audit events written by the underlying service (e.g. `customer.created`)
therefore still attribute `actorType: "human"`, since a real person's session is what
authorized the write. The registry additionally writes its own `ai_tool.invoked` /
`ai_tool.denied` / `ai_tool.rejected` / `ai_tool.failed` event, `actorType: "agent"`,
`source: "ai_tool"` (both already-existing enum values in `src/audit/model.ts`, no schema
change needed), so "who is accountable" and "what mechanism triggered this" stay
independently queryable in the same audit log rather than conflated into one fact.

## Not yet built

A persistent AI command-bar UI (the natural-language entry point end users would actually
type into) is not part of this ADR. Per the ADR 0003 addendum pattern, once one exists it
should ship first as a visual preview with no live provider or tool execution, the same way
the check-in and diagnostics screens did ahead of the authentication provider decision.
