import { describe, expect, it, vi } from "vitest";

import { ClaudeModelProvider } from "./anthropic";

/** Minimal stand-in for the SDK's `messages.create`, so no test ever reaches the network. */
function fakeClient(response: unknown) {
  const create = vi.fn().mockResolvedValue(response);
  return { client: { create } as never, create };
}

function provider(response: unknown) {
  const { client, create } = fakeClient(response);
  return { provider: new ClaudeModelProvider({ apiKey: "test-key", client }), create };
}

describe("ClaudeModelProvider", () => {
  it("returns plain text when the model does not call a tool", async () => {
    const { provider: claude } = provider({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Three jobs are waiting on parts." }],
    });

    const result = await claude.complete({
      systemPrompt: "You help a repair shop.",
      messages: [{ role: "user", content: "What is waiting on parts?" }],
      tools: [],
    });

    expect(result.message).toBe("Three jobs are waiting on parts.");
    expect(result.toolCalls).toEqual([]);
  });

  it("carries each tool call's own id so parallel calls can be told apart", async () => {
    const { provider: claude } = provider({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "toolu_1", name: "find_customer", input: { query: "Dana" } },
        { type: "tool_use", id: "toolu_2", name: "find_customer", input: { query: "Sam" } },
      ],
    });

    const result = await claude.complete({
      systemPrompt: "",
      messages: [{ role: "user", content: "Look up Dana and Sam" }],
      tools: [],
    });

    expect(result.toolCalls).toEqual([
      { id: "toolu_1", name: "find_customer", arguments: { query: "Dana" } },
      { id: "toolu_2", name: "find_customer", arguments: { query: "Sam" } },
    ]);
  });

  it("sends tool results back keyed by the id of the call they answer", async () => {
    const { provider: claude, create } = provider({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Found them." }],
    });

    await claude.complete({
      systemPrompt: "",
      messages: [
        { role: "user", content: "Look up Dana and Sam" },
        { role: "assistant", content: "Checking." },
        { role: "tool", toolName: "find_customer", toolCallId: "toolu_1", content: "Dana W." },
        { role: "tool", toolName: "find_customer", toolCallId: "toolu_2", content: "Sam O." },
      ],
      tools: [],
    });

    const sent = create.mock.calls[0]![0] as { messages: unknown[] };
    // Both results belong to one user turn, each tagged with its own call id.
    expect(sent.messages).toHaveLength(3);
    expect(sent.messages[2]).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "toolu_1", content: "Dana W." },
        { type: "tool_result", tool_use_id: "toolu_2", content: "Sam O." },
      ],
    });
  });

  it("maps our tool schema onto the API's input_schema field", async () => {
    const { provider: claude, create } = provider({ stop_reason: "end_turn", content: [] });

    await claude.complete({
      systemPrompt: "",
      messages: [{ role: "user", content: "hi" }],
      tools: [
        {
          name: "find_customer",
          description: "Find a customer by name or phone.",
          parameters: { type: "object", properties: { query: { type: "string" } } },
        },
      ],
    });

    const sent = create.mock.calls[0]![0] as { tools: unknown[] };
    expect(sent.tools[0]).toEqual({
      name: "find_customer",
      description: "Find a customer by name or phone.",
      input_schema: { type: "object", properties: { query: { type: "string" } } },
    });
  });

  it("reports a safety refusal as a message instead of returning empty content", async () => {
    const { provider: claude } = provider({
      stop_reason: "refusal",
      content: [],
    });

    const result = await claude.complete({
      systemPrompt: "",
      messages: [{ role: "user", content: "..." }],
      tools: [],
    });

    expect(result.message).toContain("declined");
    expect(result.toolCalls).toEqual([]);
  });

  it("keeps the system prompt off the message list", async () => {
    const { provider: claude, create } = provider({ stop_reason: "end_turn", content: [] });

    await claude.complete({
      systemPrompt: "Shop rules go here.",
      messages: [
        { role: "system", content: "ignored duplicate" },
        { role: "user", content: "hi" },
      ],
      tools: [],
    });

    const sent = create.mock.calls[0]![0] as { system: string; messages: unknown[] };
    expect(sent.system).toBe("Shop rules go here.");
    expect(sent.messages).toEqual([{ role: "user", content: "hi" }]);
  });
});
