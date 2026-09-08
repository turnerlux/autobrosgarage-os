import { describe, expect, it } from "vitest";

import { InMemoryAuditStore } from "../audit/store";
import { PermissionDeniedError } from "../auth/authorization";
import { testSession } from "../test/session";

import { createCustomerRecord } from "../customers/service";
import { InMemoryCustomerStore } from "../customers/store";

import { createVehicle } from "./model";
import { createVehicleRecord, getVehicleRecord, listCustomerVehicles } from "./service";
import { InMemoryVehicleStore } from "./store";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

function stores() {
  return {
    vehicles: new InMemoryVehicleStore(),
    customers: new InMemoryCustomerStore(),
    audit: new InMemoryAuditStore(),
  };
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

  it("lists a customer's vehicles newest first and excludes other customers' vehicles", async () => {
    const advisor = testSession("service_advisor", { shopId });
    const s = stores();

    const dana = await createCustomerRecord(advisor, s, {
      type: "individual",
      firstName: "Dana",
      lastName: "Whitfield",
    });
    const other = await createCustomerRecord(advisor, s, {
      type: "individual",
      firstName: "Sam",
      lastName: "Ortiz",
    });

    // Inserted through the store with explicit timestamps: two records created in the same
    // millisecond have no meaningful "newest", so the ordering assertion needs real distance.
    const older = createVehicle({ shopId, customerId: dana.id, vin: "1GNSKBE07DR123456" });
    const newer = createVehicle({ shopId, customerId: dana.id, vin: "5TFAX5GN1FX123456" });
    const someoneElses = createVehicle({ shopId, customerId: other.id, vin: "JH4KA7650MC123456" });

    await s.vehicles.insert({ ...older, createdAt: new Date("2026-01-05T09:00:00Z") });
    await s.vehicles.insert({ ...newer, createdAt: new Date("2026-06-11T09:00:00Z") });
    await s.vehicles.insert({ ...someoneElses, createdAt: new Date("2026-07-01T09:00:00Z") });

    const found = await listCustomerVehicles(advisor, s, dana.id);

    expect(found.map((vehicle) => vehicle.id)).toEqual([newer.id, older.id]);
  });

  it("returns an empty list for a customer with no vehicles on file", async () => {
    const advisor = testSession("service_advisor", { shopId });
    const s = stores();

    const customer = await createCustomerRecord(advisor, s, {
      type: "individual",
      firstName: "New",
      lastName: "Walkin",
    });

    await expect(listCustomerVehicles(advisor, s, customer.id)).resolves.toEqual([]);
  });

  it("will not list vehicles for a customer belonging to another shop", async () => {
    const s = stores();
    const advisor = testSession("service_advisor", { shopId });
    const intruder = testSession("service_advisor", {
      shopId: "6b1d5e30-2b0c-4a6f-9e77-8c3f3f4a2b11",
    });

    const customer = await createCustomerRecord(advisor, s, {
      type: "individual",
      firstName: "Dana",
      lastName: "Whitfield",
    });
    await createVehicleRecord(advisor, s, {
      customerId: customer.id,
      vin: "1GNSKBE07DR123456",
    });

    await expect(listCustomerVehicles(intruder, s, customer.id)).rejects.toThrow();
  });

  it("denies technicians from listing customer vehicles", async () => {
    const technician = testSession("technician", { shopId });
    await expect(
      listCustomerVehicles(technician, stores(), "9f7f4a0e-9a1e-4a5f-8b1a-7b0d2c3e4f55"),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
