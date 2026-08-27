import type { Role, Session } from "../auth/model";

/** Shared test helper for building an authenticated session for a given shop/role. */
export function testSession(
  role: Role,
  overrides: Partial<{ shopId: string; userId: string; active: boolean }> = {},
): Session {
  return {
    sessionId: "session-test",
    authenticatedAt: new Date("2026-08-27T12:00:00Z"),
    user: {
      id: overrides.userId ?? "9c1c7f2e-1a3b-4c9d-8e2f-6b7a5d4e3c10",
      shopId: overrides.shopId ?? "1e8f8732-e5bc-47db-b811-ffd67944dc92",
      displayName: "Test User",
      role,
      active: overrides.active ?? true,
    },
  };
}
