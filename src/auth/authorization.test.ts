import { describe, expect, it } from "vitest";

import {
  AuthenticationRequiredError,
  hasPermission,
  PermissionDeniedError,
  requirePermission,
} from "./authorization";
import type { Role, Session } from "./model";

function session(role: Role, active = true): Session {
  return {
    sessionId: "session-test",
    authenticatedAt: new Date("2026-08-27T12:00:00Z"),
    user: { id: "user-test", displayName: "Test User", role, active },
  };
}

describe("server authorization", () => {
  it("requires an authenticated session", () => {
    expect(() => requirePermission(null, "jobs:read")).toThrow(AuthenticationRequiredError);
  });

  it("rejects inactive users regardless of role", () => {
    expect(() => requirePermission(session("owner", false), "settings:manage")).toThrow(
      PermissionDeniedError,
    );
  });

  it("keeps sensitive management permissions owner-only", () => {
    for (const role of ["manager", "service_advisor", "technician", "bookkeeper"] as const) {
      expect(hasPermission(role, "users:manage")).toBe(false);
      expect(hasPermission(role, "settings:manage")).toBe(false);
    }
  });

  it("prevents technicians from reading financial data", () => {
    expect(hasPermission("technician", "money:read")).toBe(false);
    expect(hasPermission("technician", "diagnostics:write")).toBe(true);
  });

  it("grants only explicitly listed permissions", () => {
    expect(requirePermission(session("service_advisor"), "estimates:write")).toBeTruthy();
    expect(() => requirePermission(session("service_advisor"), "money:write")).toThrow(
      PermissionDeniedError,
    );
  });
});
