import { describe, expect, it } from "vitest";

import { createAuditEvent } from "./model";
import { InMemoryAuditStore } from "./store";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

describe("audit events", () => {
  it("requires a valid shop boundary", () => {
    expect(() =>
      createAuditEvent({
        shopId: "not-a-shop-id",
        actorType: "human",
        action: "customer.created",
        entityType: "customer",
        entityId: "customer-1",
        source: "web",
      }),
    ).toThrow();
  });

  it("preserves before/after traceability", async () => {
    const store = new InMemoryAuditStore();
    const event = createAuditEvent({
      shopId,
      actorType: "human",
      actorId: "user-1",
      action: "job.status_changed",
      entityType: "job",
      entityId: "job-1",
      before: { status: "checked_in" },
      after: { status: "diagnosing" },
      reason: "Technician started diagnosis",
      source: "web",
      requestId: "request-1",
    });

    await store.append(event);
    expect(store.events[0]).toMatchObject({
      shopId,
      before: { status: "checked_in" },
      after: { status: "diagnosing" },
    });
  });
});
