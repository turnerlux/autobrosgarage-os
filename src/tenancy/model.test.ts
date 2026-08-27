import { describe, expect, it } from "vitest";

import { createShop } from "./model";

describe("shop records", () => {
  it("creates an active shop with normalized slug and prefix", () => {
    const shop = createShop({
      name: "Auto Bros Garage",
      slug: "Auto-Bros",
      jobNumberPrefix: "ab",
    });

    expect(shop.slug).toBe("auto-bros");
    expect(shop.jobNumberPrefix).toBe("AB");
    expect(shop.status).toBe("active");
  });

  it("rejects a slug with invalid characters", () => {
    expect(() =>
      createShop({ name: "Auto Bros Garage", slug: "auto bros!", jobNumberPrefix: "AB" }),
    ).toThrow();
  });

  it("rejects a job number prefix outside 2-6 uppercase letters", () => {
    expect(() =>
      createShop({ name: "Auto Bros Garage", slug: "auto-bros", jobNumberPrefix: "A1" }),
    ).toThrow();
  });
});
