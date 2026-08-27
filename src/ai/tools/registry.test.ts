import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { PermissionDeniedError } from "../../auth/authorization";
import { InMemoryAuditStore } from "../../audit/store";
import { testSession } from "../../test/session";

import {
  ToolArgumentsInvalidError,
  ToolRegistry,
  UnknownToolError,
  type ToolDefinition,
} from "./registry";

interface Context {
  audit: InMemoryAuditStore;
}

let context: Context;
let registry: ToolRegistry<Context>;

const echoTool: ToolDefinition<{ message: string }, string, Context> = {
  name: "echo",
  description: "Returns the message it was given.",
  permission: "jobs:read",
  parameters: z.object({ message: z.string().min(1).max(100) }),
  handler: async (_session, _context, params) => params.message,
};

const failingTool: ToolDefinition<Record<string, never>, never, Context> = {
  name: "always_fails",
  description: "Always throws.",
  permission: "jobs:read",
  parameters: z.object({}),
  handler: async () => {
    throw new Error("boom");
  },
};

beforeEach(() => {
  context = { audit: new InMemoryAuditStore() };
  registry = new ToolRegistry<Context>();
  registry.register(echoTool);
  registry.register(failingTool);
});

describe("ToolRegistry.invoke", () => {
  it("runs the handler and records an ai_tool.invoked audit event on success", async () => {
    const session = testSession("technician");
    const result = await registry.invoke(session, "echo", { message: "hi" }, context);

    expect(result).toBe("hi");
    const event = context.audit.events.find((entry) => entry.action === "ai_tool.invoked");
    expect(event).toMatchObject({
      actorType: "agent",
      entityType: "ai_tool_call",
      entityId: "echo",
    });
    expect(event?.actorId).toBe(session.user.id);
  });

  it("throws UnknownToolError for a name that was never registered", async () => {
    const session = testSession("technician");
    await expect(registry.invoke(session, "nope", {}, context)).rejects.toThrow(UnknownToolError);
  });

  it("denies a session lacking the required permission and logs ai_tool.denied", async () => {
    const bookkeeper = testSession("bookkeeper"); // no jobs:read
    await expect(registry.invoke(bookkeeper, "echo", { message: "hi" }, context)).rejects.toThrow(
      PermissionDeniedError,
    );

    const event = context.audit.events.find((entry) => entry.action === "ai_tool.denied");
    expect(event).toMatchObject({
      actorType: "agent",
      entityId: "echo",
      reason: "permission_denied",
    });
  });

  it("rejects arguments that fail the schema and logs ai_tool.rejected without calling the handler", async () => {
    const session = testSession("technician");
    await expect(registry.invoke(session, "echo", { message: "" }, context)).rejects.toThrow(
      ToolArgumentsInvalidError,
    );

    const event = context.audit.events.find((entry) => entry.action === "ai_tool.rejected");
    expect(event).toMatchObject({ reason: "invalid_arguments" });
  });

  it("logs ai_tool.failed and rethrows when the handler itself throws", async () => {
    const session = testSession("technician");
    await expect(registry.invoke(session, "always_fails", {}, context)).rejects.toThrow("boom");

    const event = context.audit.events.find((entry) => entry.action === "ai_tool.failed");
    expect(event).toBeDefined();
  });

  it("refuses to register two tools with the same name", () => {
    expect(() => registry.register(echoTool)).toThrow(/already registered/);
  });

  it("describes registered tools with a JSON-schema-shaped parameters field", () => {
    const described = registry.describe();
    const echo = described.find((tool) => tool.name === "echo");

    expect(echo?.description).toBe(echoTool.description);
    expect(echo?.parameters).toMatchObject({ type: "object" });
  });
});
