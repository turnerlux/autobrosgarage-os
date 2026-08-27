"use client";

import Link from "next/link";
import { useState } from "react";

interface AiToolSummary {
  name: string;
  description: string;
  permission: string;
}

/**
 * Illustrative data only. This screen is a visual preview (see docs/decisions/0003 and
 * docs/decisions/0006) and does not call the real `AiModelProvider` or `ToolRegistry` built in
 * Phase 4 (`src/ai`) -- those still need a real authenticated `Session` (blocked on ADR 0003)
 * and a connected AI model provider (blocked on ADR 0006, an owner decision). The tool
 * name/description/permission below are copied verbatim from `createAiToolRegistry()` in
 * `src/ai/tools/definitions.ts` so this list can't quietly drift from what the AI can actually
 * do without someone noticing the two side-by-side.
 */
const AI_TOOLS: AiToolSummary[] = [
  {
    name: "find_customer",
    description: "Search for existing customers by name, phone, or email within the caller's shop.",
    permission: "customers:read",
  },
  {
    name: "find_vehicle",
    description: "Search for existing vehicles by VIN, plate, year, make, or model.",
    permission: "customers:read",
  },
  {
    name: "get_service_history",
    description: "List every job on record for a vehicle, newest first.",
    permission: "jobs:read",
  },
  {
    name: "create_customer",
    description:
      "Create a new customer record. Raises a conflict if a similar customer already exists, " +
      "unless a human has already reviewed and dismissed the duplicate warning.",
    permission: "customers:write",
  },
  {
    name: "create_vehicle",
    description:
      "Create a new vehicle record from a VIN, or from year, make, and model. Returns the " +
      "existing vehicle instead of creating a duplicate if the VIN is already on file.",
    permission: "customers:write",
  },
  {
    name: "create_job",
    description:
      "Open a new job for an existing customer and vehicle, generating the next job number " +
      "for the shop.",
    permission: "jobs:write",
  },
  {
    name: "update_job",
    description:
      "Move a job to a new status and/or reassign its technician, following the same allowed " +
      "transitions as the job board.",
    permission: "jobs:write",
  },
  {
    name: "save_diagnostic_finding",
    description:
      "Record a new diagnostic finding as Suspected on an open session. Confirming a finding " +
      "always requires an explicit human action.",
    permission: "diagnostics:write",
  },
];

interface ExampleCommand {
  id: string;
  prompt: string;
  toolName: string;
  preview: string;
}

const EXAMPLE_COMMANDS: ExampleCommand[] = [
  {
    id: "find-customer",
    prompt: "Find customer Jordan Ellis",
    toolName: "find_customer",
    preview: 'search this shop’s customers for "Jordan Ellis" and list any matches',
  },
  {
    id: "service-history",
    prompt: "Show the service history for this Tesla",
    toolName: "get_service_history",
    preview: "list every job on record for that vehicle, newest first",
  },
  {
    id: "open-job",
    prompt: "Open a job for a brake inspection",
    toolName: "create_job",
    preview: "open a new job for the matched customer and vehicle and generate the next job number",
  },
  {
    id: "log-finding",
    prompt: "Log a finding: no spark on cylinder 1",
    toolName: "save_diagnostic_finding",
    preview:
      "record that as a Suspected finding on the open diagnostic session — a human still has to confirm it",
  },
  {
    id: "move-job",
    prompt: "Move job AB-2026-000001 to awaiting parts",
    toolName: "update_job",
    preview:
      "move the job to that status, following the same allowed-transition rules as the job board",
  },
];

interface ConversationEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function toolByName(name: string): AiToolSummary | undefined {
  return AI_TOOLS.find((tool) => tool.name === name);
}

const NOT_CONNECTED_REPLY =
  "Auto Bros AI isn't connected to a model provider yet (see ADR 0006), so I can't act on this. " +
  "The tools below are already built and tested and will answer requests like this once a " +
  "provider is chosen and a sign-in provider (ADR 0003) is in place.";

export default function AiCommandPage() {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [draft, setDraft] = useState("");

  function appendExchange(userText: string, assistantText: string) {
    setConversation((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: userText },
      { id: crypto.randomUUID(), role: "assistant", text: assistantText },
    ]);
  }

  function runExample(example: ExampleCommand) {
    const tool = toolByName(example.toolName);
    const description = tool ? tool.description : example.toolName;
    appendExchange(
      example.prompt,
      `I'd call \`${example.toolName}\` (${description}) — it would ${example.preview}. No AI ` +
        "provider is connected yet, so this is a preview of the exchange, not a live action.",
    );
  }

  function submitDraft(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    appendExchange(text, NOT_CONNECTED_REPLY);
    setDraft("");
  }

  function clearConversation() {
    setConversation([]);
  }

  return (
    <main className="app-shell ai-workspace">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Auto Bros OS home">
          <span className="brand-mark" aria-hidden="true">
            AB
          </span>
          <span>
            <strong>Auto Bros</strong>
            <small>Garage OS</small>
          </span>
        </Link>
        <span className="environment-badge">Preview — not saved</span>
      </header>

      <section className="workspace">
        <div className="eyebrow">AI command center</div>
        <h1>Ask once. Auto Bros AI does the rest.</h1>
        <p className="intro">
          The command bar turns a plain-language request into the right action — finding a customer,
          opening a job, logging a finding — using the exact same permissions and business rules as
          a person doing it by hand. Try an example below to see how an exchange would look once a
          model provider is connected.
        </p>

        <form className="command-bar" aria-label="Auto Bros AI command" onSubmit={submitDraft}>
          <div className="command-icon" aria-hidden="true">
            ✦
          </div>
          <label htmlFor="ai-command">What needs doing?</label>
          <textarea
            id="ai-command"
            name="command"
            rows={2}
            placeholder="Check in a vehicle, find a job, or describe a shop task…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="command-actions" aria-label="Input options">
            <button
              type="button"
              disabled
              aria-label="Attach a photo"
              title="Camera capture is not built yet"
            >
              Camera
            </button>
            <button
              type="button"
              disabled
              aria-label="Record a voice note"
              title="Voice input is not built yet"
            >
              Voice
            </button>
            <button type="submit" disabled={!draft.trim()}>
              Ask
            </button>
          </div>
        </form>

        <section className="checkin-section" aria-labelledby="examples-heading">
          <h2 id="examples-heading">Try an example</h2>
          <p className="checkin-hint">
            These are canned previews, not live results — they show which tool would run and what it
            would do.
          </p>
          <ul className="checkin-suggestions" aria-label="Example commands">
            {EXAMPLE_COMMANDS.map((example) => (
              <li key={example.id}>
                <button type="button" onClick={() => runExample(example)}>
                  <span>{example.prompt}</span>
                  <span className="checkin-suggestion-detail">{example.toolName}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="checkin-section" aria-labelledby="conversation-heading">
          <div className="checkin-section-head">
            <h2 id="conversation-heading">Conversation</h2>
            {conversation.length > 0 ? (
              <button type="button" className="ghost-button" onClick={clearConversation}>
                Clear conversation
              </button>
            ) : null}
          </div>

          {conversation.length === 0 ? (
            <p className="checkin-hint">
              Nothing here yet — try an example or ask your own question.
            </p>
          ) : (
            <ul className="ai-conversation" aria-label="Conversation history">
              {conversation.map((entry) => (
                <li key={entry.id} className={`ai-message ai-message-${entry.role}`}>
                  <span className="ai-message-role">
                    {entry.role === "user" ? "You" : "Auto Bros AI"}
                  </span>
                  <p>{entry.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="checkin-section" aria-labelledby="tools-heading">
          <h2 id="tools-heading">Tools already built</h2>
          <p className="checkin-hint">
            Every action below is implemented, permission-checked, and covered by tests — they just
            aren&apos;t wired to a live conversation yet.
          </p>
          <ul className="ai-tool-grid" aria-label="Available AI tools">
            {AI_TOOLS.map((tool) => (
              <li key={tool.name} className="ai-tool-card">
                <code>{tool.name}</code>
                <p>{tool.description}</p>
                <span className="ai-tool-permission">Requires {tool.permission}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="foundation-note">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>Preview only — nothing is saved</h2>
            <p>
              This screen shows the intended AI command experience. Replies here are canned, not
              generated, and no request is sent to the real tool registry (`src/ai/tools`). The
              backend for all of this already exists and will be connected once a sign-in provider
              (ADR 0003) and an AI model provider (ADR 0006) are both chosen — both are owner
              decisions because they carry recurring cost.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
