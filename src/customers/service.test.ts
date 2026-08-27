import { describe, expect, it } from "vitest";

import { InMemoryAuditStore } from "../audit/store";
import { PermissionDeniedError } from "../auth/authorization";
import { ApplicationError } from "../lib/errors/public-error";
import { testSession } from "../test/session";

import {
  createCustomerRecord,
  getCustomerRecord,
  PossibleDuplicateCustomerError,
  updateCustomerRecord,
} from "./service";
import { InMemoryCustomerStore } from "./store";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";
const otherShopId = "2f9f8732-e5bc-47db-b811-ffd67944dc93";

function stores() {
  return { customers: new InMemoryCustomerStore(), audit: new InMemoryAuditStore() };
}

describe("customer service", () => {
  it("creates a customer and records an audit event", async () => {
    const owner = testSession("owner", { shopId });
    const s = stores();

    const customer = await createCustomerRecord(owner, s, {
      type: "individual",
      firstName: "Brennan",
      lastName: "Doyle",
      phone: "225-555-0142",
    });

    expect(customer.shopId).toBe(shopId);
    expect(s.audit.events).toHaveLength(1);
    expect(s.audit.events[0]).toMatchObject({ action: "customer.created", shopId });
  });

  it("denies technicians from creating customers", async () => {
    const technician = testSession("technician", { shopId });
    await expect(
      createCustomerRecord(technician, stores(), { type: "individual", firstName: "Sam" }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("flags a likely duplicate instead of silently creating one", async () => {
    const owner = testSession("owner", { shopId });
    const s = stores();

    await createCustomerRecord(owner, s, {
      type: "business",
      businessName: "Port City Auto",
      phone: "225-555-0100",
    });

    await expect(
      createCustomerRecord(owner, s, { type: "business", businessName: "Port City Auto" }),
    ).rejects.toThrow(PossibleDuplicateCustomerError);

    const created = await createCustomerRecord(
      owner,
      s,
      { type: "business", businessName: "Port City Auto" },
      { confirmDuplicate: true },
    );
    expect(created.displayName).toBe("Port City Auto");
  });

  it("prevents reading a customer that belongs to another shop", async () => {
    const s = stores();
    const owner = testSession("owner", { shopId });
    const intruder = testSession("owner", { shopId: otherShopId });

    const customer = await createCustomerRecord(owner, s, {
      type: "individual",
      firstName: "Sam",
      lastName: "Lee",
    });

    await expect(getCustomerRecord(intruder, s, customer.id)).rejects.toThrow(ApplicationError);
  });

  it("updates a customer and preserves before/after audit traceability", async () => {
    const owner = testSession("owner", { shopId });
    const s = stores();

    const customer = await createCustomerRecord(owner, s, {
      type: "individual",
      firstName: "Sam",
      lastName: "Lee",
    });

    const updated = await updateCustomerRecord(owner, s, customer.id, {
      phone: "225-555-0175",
    });

    expect(updated.phoneDigits).toBe("2255550175");
    const auditEntry = s.audit.events.find((event) => event.action === "customer.updated");
    expect(auditEntry?.before).toMatchObject({ id: customer.id });
    expect(auditEntry?.after).toMatchObject({ phoneDigits: "2255550175" });
  });
});
