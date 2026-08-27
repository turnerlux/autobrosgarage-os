import { beforeEach, describe, expect, it } from "vitest";

import { PermissionDeniedError } from "../auth/authorization";
import { InMemoryAuditStore } from "../audit/store";
import { testSession } from "../test/session";

import { getBusinessSettingsRecord, updateBusinessSettingsRecord } from "./service";
import { InMemoryBusinessSettingsStore } from "./store";
import type { BusinessSettingsStores } from "./service";

let stores: BusinessSettingsStores;

beforeEach(() => {
  stores = { settings: new InMemoryBusinessSettingsStore(), audit: new InMemoryAuditStore() };
});

describe("getBusinessSettingsRecord", () => {
  it("seeds and persists defaults the first time a shop is read", async () => {
    const session = testSession("owner");

    const first = await getBusinessSettingsRecord(session, stores);
    const second = await getBusinessSettingsRecord(session, stores);

    expect(first.id).toBe(second.id);
    expect(await stores.settings.findByShop(session.user.shopId)).not.toBeNull();
  });

  it("denies technicians, who have no estimates:read permission", async () => {
    const session = testSession("technician");
    await expect(getBusinessSettingsRecord(session, stores)).rejects.toThrow(PermissionDeniedError);
  });

  it("allows bookkeepers to read settings", async () => {
    const session = testSession("bookkeeper");
    await expect(getBusinessSettingsRecord(session, stores)).resolves.toBeTruthy();
  });
});

describe("updateBusinessSettingsRecord", () => {
  it("lets the owner change the labor rate and records an audit event", async () => {
    const owner = testSession("owner");
    const updated = await updateBusinessSettingsRecord(owner, stores, {
      standardLaborRateCents: 15_000,
    });

    expect(updated.standardLaborRateCents).toBe(15_000);
    expect(updated.version).toBe(2);

    const auditStore = stores.audit as InMemoryAuditStore;
    const event = auditStore.events.find((entry) => entry.action === "business_settings.updated");
    expect(event).toBeDefined();
    expect(event?.actorType).toBe("human");
    expect(event?.actorId).toBe(owner.user.id);
  });

  it("denies a manager, since only the owner has settings:manage", async () => {
    const manager = testSession("manager");
    await expect(
      updateBusinessSettingsRecord(manager, stores, { standardLaborRateCents: 15_000 }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
