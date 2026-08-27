import { describe, expect, it } from "vitest";

import { applyCustomerUpdate, createCustomer } from "./model";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

describe("customer records", () => {
  it("derives a display name for individuals", () => {
    const customer = createCustomer({
      shopId,
      type: "individual",
      firstName: "Brennan",
      lastName: "Doyle",
      phone: "(225) 555-0142",
    });

    expect(customer.displayName).toBe("Brennan Doyle");
    expect(customer.phoneDigits).toBe("2255550142");
  });

  it("derives a display name for a dealer/business", () => {
    const customer = createCustomer({
      shopId,
      type: "business",
      businessName: "Port City Auto",
      isDealer: true,
    });

    expect(customer.displayName).toBe("Port City Auto");
    expect(customer.isDealer).toBe(true);
  });

  it("rejects a customer with no identifying name", () => {
    expect(() => createCustomer({ shopId, type: "individual" })).toThrow();
  });

  it("rejects an invalid email", () => {
    expect(() =>
      createCustomer({ shopId, type: "individual", firstName: "Sam", email: "not-an-email" }),
    ).toThrow();
  });

  it("recomputes phoneDigits on update", () => {
    const customer = createCustomer({ shopId, type: "individual", firstName: "Sam" });
    const updated = applyCustomerUpdate(customer, { phone: "225.555.0199" });
    expect(updated.phoneDigits).toBe("2255550199");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(customer.updatedAt.getTime());
  });
});
