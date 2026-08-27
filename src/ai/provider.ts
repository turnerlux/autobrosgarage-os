/**
 * Provider-neutral shape for a single AI completion turn. Mirrors `src/auth/provider.ts`
 * and `src/storage/provider.ts`: define the interface and a safe "not configured" stub now,
 * so the rest of the system (system-prompt assembly, the tool registry, a future command-bar
 * UI) can be built and tested end-to-end without picking, paying for, or connecting a real
 * vendor. Connecting a real provider (e.g. OpenAI) is a paid-provider decision with recurring
 * cost and is deferred to the owner -- see docs/decisions/0006-ai-model-provider-boundary.md.
 */

export type AiMessageRole = "system" | "user" | "assistant" | "tool";

export interface AiMessage {
  role: AiMessageRole;
  content: string;
  /** Set on `role: "tool"` messages so the model can see the result of a prior tool call. */
  toolName?: string;
}

/** JSON-Schema-shaped tool description, e.g. from `zod`'s `z.toJSONSchema()`. */
export interface AiToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AiCompletionRequest {
  /** Assembled fresh on every call from the database (business settings, role, etc.) -- never cached in the model's own memory as the record of truth. */
  systemPrompt: string;
  messages: AiMessage[];
  tools: AiToolSchema[];
}

export interface AiToolCallRequest {
  name: string;
  arguments: unknown;
}

export interface AiCompletionResponse {
  /** Present when the model responds with plain text instead of, or in addition to, tool calls. */
  message?: string;
  toolCalls: AiToolCallRequest[];
}

export interface AiModelProvider {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}

export class AiModelProviderNotConfiguredError extends Error {
  constructor() {
    super("An AI model provider has not been configured");
    this.name = "AiModelProviderNotConfiguredError";
  }
}

/** Fails closed: no default vendor, no silent fallback, no simulated response. */
export class UnconfiguredAiModelProvider implements AiModelProvider {
  async complete(): Promise<AiCompletionResponse> {
    throw new AiModelProviderNotConfiguredError();
  }
}
