import { describe, expect, it } from "vitest";

import { InMemoryAuditStore } from "../audit/store";
import { PermissionDeniedError } from "../auth/authorization";
import { testSession } from "../test/session";

import { createVehicleRecord, getVehicleRecord } from "./service";
import { InMemoryVehicleStore } from "./store";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

function stores() {
  return { vehicles: new InMemoryVehicleStore(), audit: new InMemoryAuditStore() };
}

describe("vehicle service", () => {
  it("creates a vehicle and records an audit event", async () => {
    const advisor = testSession("service_advisor", { shopId });
    const s = stores();

    const { vehicle, reused } = await createVehicleRecord(advisor, s, {
      vin: "1GNSKBE07DR123456",
    });

    expect(reused).toBe(false);
    expect(vehicle.shopId).toBe(shopId);
    expect(s.audit.events[0]).toMatchObject({ action: "vehicle.created" });
  });

  it("reuses an existing vehicle instead of creating a duplicate VIN", async () => {
    const advisor = testSession("service_advisor", { shopId });
    const s = stores();

    const first = await createVehicleRecord(advisor, s, { vin: "1GNSKBE07DR123456" });
    const second = await createVehicleRecord(advisor, s, { vin: "1gnskbe07dr123456" });

    expect(second.reused).toBe(true);
    expect(second.vehicle.id).toBe(first.vehicle.id);
    expect(s.audit.events).toHaveLength(1);
  });

  it("denies technicians from creating vehicles", async () => {
    const technician = testSession("technician", { shopId });
    await expect(
      createVehicleRecord(technician, stores(), { vin: "1GNSKBE07DR123456" }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("prevents fetching a vehicle from a different shop", async () => {
    const s = stores();
    const advisor = testSession("service_advisor", { shopId });
    const intruder = testSession("service_advisor", { shopId: "different-shop" });

    const { vehicle } = await createVehicleRecord(advisor, s, { vin: "1GNSKBE07DR123456" });
    await expect(getVehicleRecord(intruder, s, vehicle.id)).rejects.toThrow();
  });
});
