// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("database baseline migration", () => {
  it("creates an isolated application schema without destructive statements", async () => {
    const migration = await readFile(
      resolve(process.cwd(), "drizzle/0000_hot_valkyrie.sql"),
      "utf8",
    );

    expect(migration).toContain('CREATE SCHEMA "app"');
    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE)\b/i);
  });
});
