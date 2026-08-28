import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores a salted scrypt hash and verifies without exposing the password", async () => {
    const password = "Temporary!2026";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword!2026", hash)).toBe(false);
  });

  it("fails closed for malformed hashes", async () => {
    expect(await verifyPassword("Temporary!2026", "not-a-password-hash")).toBe(false);
  });
});
