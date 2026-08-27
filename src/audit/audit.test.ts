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

describe("listForEntities", () => {
  it("returns events for any of the requested entity refs, oldest first", async () => {
    const store = new InMemoryAuditStore();
    await store.append(
      createAuditEvent({
        shopId,
        actorType: "human",
        action: "diagnostic_session.opened",
        entityType: "diagnostic_session",
        entityId: "session-1",
        source: "web",
      }),
    );
    await store.append(
      createAuditEvent({
        shopId,
        actorType: "human",
        action: "diagnostic_finding.created",
        entityType: "diagnostic_finding",
        entityId: "finding-1",
        source: "web",
      }),
    );
    await store.append(
      createAuditEvent({
        shopId,
        actorType: "human",
        action: "diagnostic_finding.created",
        entityType: "diagnostic_finding",
        entityId: "finding-unrelated",
        source: "web",
      }),
    );

    const events = await store.listForEntities(shopId, [
      { entityType: "diagnostic_session", entityId: "session-1" },
      { entityType: "diagnostic_finding", entityId: "finding-1" },
    ]);

    expect(events.map((event) => event.entityId)).toEqual(["session-1", "finding-1"]);
  });

  it("never returns another shop's events for the same entity id", async () => {
    const store = new InMemoryAuditStore();
    const otherShopId = "9f9f8732-e5bc-47db-b811-ffd67944dc99";
    await store.append(
      createAuditEvent({
        shopId: otherShopId,
        actorType: "human",
        action: "diagnostic_session.opened",
        entityType: "diagnostic_session",
        entityId: "shared-id",
        source: "web",
      }),
    );

    const events = await store.listForEntities(shopId, [
      { entityType: "diagnostic_session", entityId: "shared-id" },
    ]);

    expect(events).toHaveLength(0);
  });

  it("returns an empty list when given no refs", async () => {
    const store = new InMemoryAuditStore();
    const events = await store.listForEntities(shopId, []);
    expect(events).toEqual([]);
  });
});
