import { describe, expect, it } from "vitest";

import { createShopUser } from "./model";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

describe("shop user records", () => {
  it("creates an active staff record with a valid role", () => {
    const user = createShopUser({ shopId, role: "technician", displayName: "Alex Tech" });
    expect(user.active).toBe(true);
    expect(user.role).toBe("technician");
  });

  it("rejects an unrecognized role", () => {
    expect(() =>
      createShopUser({ shopId, role: "super_admin" as never, displayName: "Someone" }),
    ).toThrow();
  });
});
