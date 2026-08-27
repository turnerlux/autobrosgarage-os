import { describe, expect, it } from "vitest";

import { testSession } from "../test/session";

import {
  AuthenticationRequiredError,
  hasPermission,
  PermissionDeniedError,
  requirePermission,
  requireSameShop,
} from "./authorization";
import type { Role } from "./model";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

function session(role: Role, active = true) {
  return testSession(role, { shopId, active });
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

  it("rejects records that belong to a different shop", () => {
    expect(() => requireSameShop(session("owner"), "another-shop-id")).toThrow(
      PermissionDeniedError,
    );
    expect(() => requireSameShop(session("owner"), shopId)).not.toThrow();
  });
});
