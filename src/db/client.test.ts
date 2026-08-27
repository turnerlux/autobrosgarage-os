// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ APP_ENV: "test" }),
}));

import { DatabaseConfigurationError, getDatabase } from "./client";

describe("getDatabase", () => {
  it("fails closed when no database connection is configured", () => {
    expect(() => getDatabase()).toThrow(DatabaseConfigurationError);
  });
});
