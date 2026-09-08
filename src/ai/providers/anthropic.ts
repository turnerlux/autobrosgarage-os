import Anthropic from "@anthropic-ai/sdk";

import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiMessage,
  AiModelProvider,
  AiToolSchema,
} from "../provider";

/**
 * The Claude adapter for `AiModelProvider` -- the one file that turns the provider-neutral
 * boundary in `../provider.ts` into a real, paid model connection. Nothing else in `src/ai`
 * knows this file exists; swapping vendors means writing a sibling of it, not editing the
 * registry, the tools, or any screen.
 *
 * See `docs/decisions/0006-ai-model-provider-boundary.md` for why the boundary came first,
 * and `docs/ai-provider.md` for the operational limits an owner must set before enabling it.
 */

/** Default model. Override with `AI_MODEL` -- cheaper tiers are documented in docs/ai-provider.md. */
export const defaultAiModel = "claude-opus-5";

/** Response ceiling for one turn. Tool-calling turns are short; drafted summaries are not. */
const defaultMaxTokens = 8_000;

export interface ClaudeModelProviderOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  /** Injectable for tests; defaults to a real SDK client built from `apiKey`. */
  client?: Pick<Anthropic["messages"], "create">;
}

/** `{name, description, parameters}` is our shape; Anthropic names the last one `input_schema`. */
function toAnthropicTool(tool: AiToolSchema): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema,
  };
}

/**
 * Flattens our role list into Anthropic's user/assistant alternation. A `tool` message becomes
 * a `tool_result` block on a user turn, keyed by the id of the call it answers -- consecutive
 * tool results are merged into one user message, which is what the API expects when the model
 * asked for several tools at once.
 */
function toAnthropicMessages(messages: AiMessage[]): Anthropic.MessageParam[] {
  const converted: Anthropic.MessageParam[] = [];

  for (const message of messages) {
    if (message.role === "system") continue; // Carried on the top-level system field instead.

    if (message.role === "tool") {
      const block: Anthropic.ToolResultBlockParam = {
        type: "tool_result",
        tool_use_id: message.toolCallId ?? message.toolName ?? "unknown_tool_call",
        content: message.content,
      };
      const previous = converted.at(-1);
      if (previous?.role === "user" && Array.isArray(previous.content)) {
        previous.content.push(block);
      } else {
        converted.push({ role: "user", content: [block] });
      }
      continue;
    }

    converted.push({ role: message.role, content: message.content });
  }

  return converted;
}

export class ClaudeModelProvider implements AiModelProvider {
  private readonly client: Pick<Anthropic["messages"], "create">;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(options: ClaudeModelProviderOptions) {
    this.client = options.client ?? new Anthropic({ apiKey: options.apiKey }).messages;
    this.model = options.model ?? defaultAiModel;
    this.maxTokens = options.maxTokens ?? defaultMaxTokens;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const response = await this.client.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: request.systemPrompt,
      messages: toAnthropicMessages(request.messages),
      tools: request.tools.map(toAnthropicTool),
      thinking: { type: "adaptive" },
    });

    // A safety decline arrives as a normal 200 response, so it must be checked before content.
    if (response.stop_reason === "refusal") {
      return {
        message:
          "Auto Bros AI declined that request. Ask a person to handle it, or rephrase the request.",
        toolCalls: [],
      };
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    const toolCalls = response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
      .map((block) => ({ id: block.id, name: block.name, arguments: block.input }));

    return { message: text || undefined, toolCalls };
  }
}
