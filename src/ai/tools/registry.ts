import { z } from "zod";

import { requirePermission } from "../../auth/authorization";
import type { Permission, Session } from "../../auth/model";
import { createAuditEvent } from "../../audit/model";
import type { AuditStore } from "../../audit/store";

import type { AiToolSchema } from "../provider";

export class UnknownToolError extends Error {
  constructor(name: string) {
    super(`No AI tool is registered with the name "${name}"`);
    this.name = "UnknownToolError";
  }
}

export class ToolArgumentsInvalidError extends Error {
  constructor(
    name: string,
    public readonly issues: string[],
  ) {
    super(`Arguments for tool "${name}" failed validation: ${issues.join("; ")}`);
    this.name = "ToolArgumentsInvalidError";
  }
}

/**
 * A single natural-language-callable action. `permission` is checked with the exact same
 * `requirePermission` used by every human-facing route, and `handler` is expected to call
 * into the real Phase 1/3 service functions (e.g. `createCustomerRecord`) rather than touch
 * stores directly -- that way a tool call can never bypass a business rule or audit event
 * that the equivalent human action would have gone through. See
 * docs/decisions/0006-ai-model-provider-boundary.md for the reasoning.
 */
export interface ToolDefinition<TParams, TResult, TContext> {
  name: string;
  description: string;
  permission: Permission;
  parameters: z.ZodType<TParams>;
  handler: (session: Session, context: TContext, params: TParams) => Promise<TResult>;
}

export interface ToolInvocationOptions {
  requestId?: string;
}

/**
 * Holds the set of tools the AI is allowed to call and enforces, for every single
 * invocation regardless of caller: (1) the calling session actually has the required
 * permission, (2) the arguments match the declared schema, and (3) an audit event is
 * written for the attempt -- on denial and on failure, not only on success. This is the
 * "tool authorization middleware" and "audit logging for AI-initiated actions" backlog
 * items; `../../auth/authorization.ts` and `../../audit/model.ts` do the actual work, this
 * class only wires them into every tool call uniformly so an individual tool definition
 * cannot forget to check permission or log an attempt.
 *
 * Domain audit events written by the underlying service (e.g. `customer.created`) still
 * attribute to the human whose session authorized the call -- an AI tool call always runs
 * inside a real human's authenticated session, it never has an identity of its own. The
 * events this class writes (`ai_tool.*`, actorType "agent", source "ai_tool") are a
 * separate, parallel record of "this was proposed/executed via an AI tool call", so the two
 * facts -- who is accountable, and what mechanism triggered the change -- stay independently
 * queryable.
 */
export class ToolRegistry<TContext extends { audit: AuditStore }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly tools = new Map<string, ToolDefinition<any, any, TContext>>();

  register<TParams, TResult>(tool: ToolDefinition<TParams, TResult, TContext>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`A tool named "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /** Tool schemas suitable for `AiCompletionRequest.tools`, once a provider is connected. */
  describe(): AiToolSchema[] {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.parameters) as Record<string, unknown>,
    }));
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async invoke(
    session: Session,
    name: string,
    rawArguments: unknown,
    context: TContext,
    options: ToolInvocationOptions = {},
  ): Promise<unknown> {
    const shopId = session.user.shopId;
    const tool = this.tools.get(name);
    if (!tool) throw new UnknownToolError(name);

    try {
      requirePermission(session, tool.permission);
    } catch (error) {
      await context.audit.append(
        createAuditEvent({
          shopId,
          actorType: "agent",
          actorId: session.user.id,
          action: "ai_tool.denied",
          entityType: "ai_tool_call",
          entityId: name,
          after: { tool: name },
          reason: "permission_denied",
          source: "ai_tool",
          requestId: options.requestId,
        }),
      );
      throw error;
    }

    const parsed = tool.parameters.safeParse(rawArguments);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      );
      await context.audit.append(
        createAuditEvent({
          shopId,
          actorType: "agent",
          actorId: session.user.id,
          action: "ai_tool.rejected",
          entityType: "ai_tool_call",
          entityId: name,
          after: { tool: name, issues },
          reason: "invalid_arguments",
          source: "ai_tool",
          requestId: options.requestId,
        }),
      );
      throw new ToolArgumentsInvalidError(name, issues);
    }

    try {
      const result = await tool.handler(session, context, parsed.data);
      await context.audit.append(
        createAuditEvent({
          shopId,
          actorType: "agent",
          actorId: session.user.id,
          action: "ai_tool.invoked",
          entityType: "ai_tool_call",
          entityId: name,
          after: { tool: name, arguments: parsed.data },
          source: "ai_tool",
          requestId: options.requestId,
        }),
      );
      return result;
    } catch (error) {
      await context.audit.append(
        createAuditEvent({
          shopId,
          actorType: "agent",
          actorId: session.user.id,
          action: "ai_tool.failed",
          entityType: "ai_tool_call",
          entityId: name,
          after: {
            tool: name,
            arguments: parsed.data,
            error: error instanceof Error ? error.message : "unknown error",
          },
          source: "ai_tool",
          requestId: options.requestId,
        }),
      );
      throw error;
    }
  }
}
