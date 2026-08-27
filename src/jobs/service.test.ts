import { describe, expect, it } from "vitest";

import { InMemoryAuditStore } from "../audit/store";
import { PermissionDeniedError } from "../auth/authorization";
import { createCustomer } from "../customers/model";
import { InMemoryCustomerStore } from "../customers/store";
import { ApplicationError } from "../lib/errors/public-error";
import { testSession } from "../test/session";
import { createShop } from "../tenancy/model";
import { InMemoryShopStore } from "../tenancy/store";
import { createShopUser } from "../users/model";
import { InMemoryUserStore } from "../users/store";
import { createVehicle } from "../vehicles/model";
import { InMemoryVehicleStore } from "../vehicles/store";

import { InMemoryJobNumberCounterStore } from "./job-number";
import { assignTechnician, createJobRecord, updateJobStatus } from "./service";
import { InMemoryJobStore } from "./store";

async function buildFixture() {
  const shops = new InMemoryShopStore();
  const shop = createShop({ name: "Auto Bros Garage", slug: "auto-bros", jobNumberPrefix: "AB" });
  await shops.insert(shop);

  const session = testSession("service_advisor", { shopId: shop.id });

  const customers = new InMemoryCustomerStore();
  const customer = createCustomer({ shopId: shop.id, type: "individual", firstName: "Sam" });
  await customers.insert(customer);

  const vehicles = new InMemoryVehicleStore();
  const vehicle = createVehicle({ shopId: shop.id, vin: "1GNSKBE07DR123456" });
  await vehicles.insert(vehicle);

  const users = new InMemoryUserStore();
  const technician = createShopUser({
    shopId: shop.id,
    role: "technician",
    displayName: "Alex Tech",
  });
  await users.insert(technician);

  const stores = {
    jobs: new InMemoryJobStore(),
    jobNumberCounters: new InMemoryJobNumberCounterStore(),
    shops,
    customers,
    vehicles,
    users,
    audit: new InMemoryAuditStore(),
  };

  return { session, shop, customer, vehicle, technician, stores };
}

describe("job service", () => {
  it("creates a job with a generated job number and audit event", async () => {
    const { session, customer, vehicle, stores } = await buildFixture();

    const job = await createJobRecord(session, stores, {
      customerId: customer.id,
      vehicleId: vehicle.id,
      complaint: "Won't start",
    });

    expect(job.jobNumber).toBe("AB-2026-000001");
    expect(job.status).toBe("checked_in");
    expect(stores.audit.events[0]).toMatchObject({ action: "job.created" });
  });

  it("denies technicians from opening a job", async () => {
    const { customer, vehicle, stores, shop } = await buildFixture();
    const technicianSession = testSession("technician", { shopId: shop.id });

    await expect(
      createJobRecord(technicianSession, stores, {
        customerId: customer.id,
        vehicleId: vehicle.id,
        complaint: "Won't start",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("rejects a customer or vehicle from another shop", async () => {
    const { session, vehicle, stores } = await buildFixture();
    const otherShop = createShop({
      name: "Other Shop",
      slug: "other-shop",
      jobNumberPrefix: "OS",
    });
    await stores.shops.insert(otherShop);
    const otherCustomer = createCustomer({
      shopId: otherShop.id,
      type: "individual",
      firstName: "Different",
    });
    await stores.customers.insert(otherCustomer);

    await expect(
      createJobRecord(session, stores, {
        customerId: otherCustomer.id,
        vehicleId: vehicle.id,
        complaint: "Won't start",
      }),
    ).rejects.toThrow(ApplicationError);
  });

  it("rejects assigning an inactive or unknown technician", async () => {
    const { session, customer, vehicle, stores } = await buildFixture();

    await expect(
      createJobRecord(session, stores, {
        customerId: customer.id,
        vehicleId: vehicle.id,
        complaint: "Won't start",
        assignedTechnicianId: "unknown-user-id",
      }),
    ).rejects.toThrow(ApplicationError);
  });

  it("moves a job through statuses and records each transition", async () => {
    const { session, customer, vehicle, stores } = await buildFixture();
    const job = await createJobRecord(session, stores, {
      customerId: customer.id,
      vehicleId: vehicle.id,
      complaint: "Won't start",
    });

    const updated = await updateJobStatus(session, stores, job.id, "awaiting_diagnosis");
    expect(updated.status).toBe("awaiting_diagnosis");
    expect(stores.audit.events.some((event) => event.action === "job.status_changed")).toBe(true);
  });

  it("assigns a technician and records the audit trail", async () => {
    const { session, customer, vehicle, technician, stores } = await buildFixture();
    const job = await createJobRecord(session, stores, {
      customerId: customer.id,
      vehicleId: vehicle.id,
      complaint: "Won't start",
    });

    const updated = await assignTechnician(session, stores, job.id, technician.id);
    expect(updated.assignedTechnicianId).toBe(technician.id);
    expect(stores.audit.events.some((event) => event.action === "job.assigned")).toBe(true);
  });
});
