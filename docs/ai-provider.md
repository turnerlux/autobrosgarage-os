# Connecting an AI model provider

The AI boundary described in `docs/decisions/0006-ai-model-provider-boundary.md` now has a real
adapter: `src/ai/providers/anthropic.ts`. This document is the operational side — what to set,
what it costs, and what to decide before turning it on.

## Subscriptions are not API access

A ChatGPT Plus/Business or Claude Pro/Max subscription is a **login for a person** to use a chat
website. It gives an application nothing. There is no way for this app to reach through a seat
and get an answer back.

What the app needs is an **API key**: a separate product, billed per unit of text processed
rather than per seat. One key serves the whole shop.

This distinction matters for a plan that came up early on — buying seats so per-employee usage
could be tracked and billed into shop fees. That goal is sound, and the API does it _better_:
every response reports exactly how much it used, and because every action in this app already
carries the user id who authorized it, per-employee and even per-job cost is a small addition to
the existing audit record rather than a separate accounting system.

## Turning it on

1. Create an API key at <https://console.anthropic.com>.
2. **Set a spend limit in the console before you use the key.** Do this first — it is the only
   thing standing between a bug in a loop and a surprising bill.
3. Add to `.env.local` (and to your Vercel environment variables for production):

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

With no key set, `getAiModelProvider()` returns the fail-closed stub and every AI call throws
`AiModelProviderNotConfiguredError`. That is deliberate: an unconfigured AI feature must be
visibly off, never silently degraded.

## Choosing a model

`AI_MODEL` overrides the default. Rough cost for one job summary:

| Model            | `AI_MODEL` value   | Per summary | Good for                                    |
| ---------------- | ------------------ | ----------- | ------------------------------------------- |
| Claude Opus 5    | `claude-opus-5`    | ~5¢         | Default. Best judgment on messy shop notes. |
| Claude Sonnet 5  | `claude-sonnet-5`  | ~1–2¢       | Strong and noticeably cheaper.              |
| Claude Haiku 4.5 | `claude-haiku-4-5` | under 1¢    | High volume, simple drafting.               |

A few hundred jobs a month lands in the **$10–30** range on a mid-tier model. Start on the
cheaper end and move up only if the writing isn't good enough — the adapter takes one env var,
so switching is a config change, not a code change.

## What the adapter does and does not do

It implements one method, `complete()`, which sends the system prompt, conversation, and tool
list to Claude and returns either text or a list of tool calls. It handles three things worth
knowing about:

- **Tool call ids.** A model can ask for several tools in one turn. Each request carries its own
  id, and results are matched back by that id. The provider interface previously carried only a
  tool _name_, which cannot distinguish two calls to the same tool in one turn.
- **Refusals.** A safety decline arrives as a normal successful response with
  `stop_reason: "refusal"`, not an error. Unchecked, that reads as an empty answer. The adapter
  turns it into a plain message.
- **Nothing else.** It does not decide what the AI is allowed to do. Every tool call still goes
  through `ToolRegistry.invoke`, which applies the same permission matrix a human hits and writes
  the same audit events. A model cannot do through a tool what its operator cannot do by hand.

## Decide before going live

ADR 0006 reserved these for the owner, and they are still open:

- **A spend cap**, set in the provider console (see step 2 above).
- **What customer data may appear in a prompt.** Names and complaints are one decision; phone
  numbers, addresses, and photos are another. Whatever is sent leaves your database.
- **Which tools ship.** Eight are registered. All sit in the "allowed automatically" tier of
  master spec §22. Anything that sends a quote, orders parts, or moves money needs an explicit
  approval step first — not just a permission check.
- **Parts and labor data.** A model will confidently produce a wrong part number or labor time.
  The master spec already forbids relying on invented values (Phase 9, "prevent AI from inventing
  unverified labor/part values"). Real parts pricing means licensing a catalog provider. Do not
  let the AI fill that gap.
