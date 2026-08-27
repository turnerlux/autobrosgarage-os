import { describe, expect, it } from "vitest";

import { EnvironmentValidationError, parseServerEnvironment } from "./server";

describe("parseServerEnvironment", () => {
  it("provides safe local defaults without requiring credentials", () => {
    expect(parseServerEnvironment({})).toEqual({
      APP_ENV: "local",
      APP_ORIGIN: "http://localhost:3000",
      LOG_LEVEL: "info",
    });
  });

  it("rejects malformed values without including secret contents", () => {
    const secret = "short-secret";

    expect(() =>
      parseServerEnvironment({
        APP_ORIGIN: "not-a-url",
        AUTH_SECRET: secret,
        DATABASE_URL: "https://database.example.com",
      }),
    ).toThrow(EnvironmentValidationError);

    try {
      parseServerEnvironment({ AUTH_SECRET: secret });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it("requires database and auth configuration outside local and test", () => {
    expect(() => parseServerEnvironment({ APP_ENV: "production" })).toThrow(
      /DATABASE_URL: is required when APP_ENV is production/,
    );
    expect(() => parseServerEnvironment({ APP_ENV: "preview" })).toThrow(
      /AUTH_SECRET: is required when APP_ENV is preview/,
    );
  });

  it("accepts a fully configured promoted environment", () => {
    const environment = parseServerEnvironment({
      APP_ENV: "staging",
      APP_ORIGIN: "https://staging.autobros.example",
      AUTH_SECRET: "a-secure-random-value-with-32-characters",
      DATABASE_URL: "postgresql://app:password@database.internal/autobros",
    });

    expect(environment.APP_ENV).toBe("staging");
    expect(environment.DATABASE_URL).toMatch(/^postgresql:/);
  });
});
