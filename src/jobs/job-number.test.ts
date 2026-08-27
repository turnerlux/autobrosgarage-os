import { describe, expect, it } from "vitest";

import { formatJobNumber, generateJobNumber, InMemoryJobNumberCounterStore } from "./job-number";

describe("job numbers", () => {
  it("formats a zero-padded, prefixed job number", () => {
    expect(formatJobNumber("AB", 2026, 7)).toBe("AB-2026-000007");
  });

  it("issues sequential numbers per shop and year, never reusing one", async () => {
    const counters = new InMemoryJobNumberCounterStore();
    const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";
    const checkedInAt = new Date("2026-08-27T12:00:00Z");

    const first = await generateJobNumber(counters, shopId, "AB", checkedInAt);
    const second = await generateJobNumber(counters, shopId, "AB", checkedInAt);

    expect(first).toBe("AB-2026-000001");
    expect(second).toBe("AB-2026-000002");
  });

  it("keeps separate sequences for different shops sharing the same year", async () => {
    const counters = new InMemoryJobNumberCounterStore();
    const checkedInAt = new Date("2026-08-27T12:00:00Z");

    const shopA = await generateJobNumber(counters, "shop-a", "AB", checkedInAt);
    const shopB = await generateJobNumber(counters, "shop-b", "XY", checkedInAt);

    expect(shopA).toBe("AB-2026-000001");
    expect(shopB).toBe("XY-2026-000001");
  });
});
