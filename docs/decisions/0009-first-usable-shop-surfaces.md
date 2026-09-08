# 0009 — First usable shop surfaces, and a real AI adapter

Status: Accepted
Date: 2026-09-07

## Context

Phases 0–4 built a large amount of tested service-layer work — core records, diagnostics, a
permission-checked AI tool registry — but only one screen (`/check-in`) reads or writes any of
it. In practice that left the application write-only: a job could be created and then never seen
again from inside the app. The home page did not link to check-in at all, so the one working
surface was reachable only by typing its URL.

Separately, three smaller gaps had the same shape — finished work with the last inch missing:

- `universalSearch` finds a returning customer, but nothing listed the vehicles already on file
  for them, so every repeat visit re-typed a VIN that was already in the database.
- `AiModelProvider` described a complete model call, but no implementation of it existed.
- `AiToolCallRequest` carried a tool _name_ but no id, so two calls to the same tool in one turn
  could not be matched to their results.

## Decision

Close the last inch on each, without starting a new phase.

### Job board (`/jobs`)

`JobStore.listRecent` and `listShopJobs` follow the existing `listByVehicle` /
`getVehicleServiceHistory` pair exactly: tenant-scoped by `session.user.shopId` with no id a
caller could pass to widen it, gated on `jobs:read`, and capped at `jobBoardLimit` so a large
shop cannot pull its entire history in one request. The screen defaults to open work — closed
and paid jobs are behind a toggle rather than absent, since a shop still needs to look them up.

### Returning-customer vehicle picker

`VehicleStore.listByCustomer` and `listCustomerVehicles` complete the repeat-visit flow. The
customer is re-read through the caller's own shop id before any vehicle is returned, so a
customer id from another shop cannot be used to enumerate that shop's vehicles; a missing and a
cross-shop customer produce the same empty response, so the route never confirms that a record
exists elsewhere.

Selecting a saved vehicle fills VIN, year, make, model, and plate — but deliberately leaves
mileage blank, since it is the one field that is genuinely different every visit. No new write
path was needed: the check-in flow already de-duplicates by VIN, so reusing a saved vehicle
resolves to the existing record.

### Claude adapter

`src/ai/providers/anthropic.ts` implements `AiModelProvider` against the Anthropic API, and
`src/ai/runtime.ts` selects it only when `ANTHROPIC_API_KEY` is present — otherwise the
fail-closed `UnconfiguredAiModelProvider` stands, preserving the rule from ADR 0006 that an
unconfigured AI feature is visibly off rather than quietly degraded. No screen calls it yet;
this ADR adds the adapter, not a live feature.

The interface gained `AiToolCallRequest.id` and `AiMessage.toolCallId`. Both Anthropic and
OpenAI match a tool result to its call by id, so this is a portability fix rather than a
vendor detail — the previous shape would have failed on either provider the first time a model
requested two tools at once.

Model choice is `AI_MODEL`, defaulting to `claude-opus-5`. Cost per tier is documented in
`docs/ai-provider.md`; switching is a configuration change.

### Staff roster removed from version control

`scripts/bootstrap-staff.mjs` now reads a git-ignored `scripts/staff.json` instead of a
hard-coded array. The committed array published every valid username and each person's
privilege level in a public repository. Passwords were never at risk — they are generated at
runtime and stored only as scrypt hashes — but the roster removed the need to guess usernames,
named the highest-value account, and published employees' names. Because lockout is per
username, it also let any stranger lock real staff out with junk login attempts.

## What this does not do

- **The lockout denial-of-service is not fixed here.** Removing the public roster raises the cost
  of the attack; it does not remove it. A proper fix is per-IP throttling that does not let an
  unauthenticated attacker lock a known-good account, and it belongs with the Phase 15 security
  work rather than bolted onto a usability change.
- **No MFA, no rate limiting, no password change flow.** All Phase 15, all still open.
- **The dashboard tiles are still static.** The job board now answers the same question, so
  wiring the tiles is presentation work that can follow.
- **No AI screen is connected.** `/ai` and `/diagnostics` remain previews. Connecting them needs
  a live provider decision (ADR 0006) that remains the owner's.
