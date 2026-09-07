import { describe, expect, it } from "vitest";

import { InMemoryAuditStore } from "../audit/store";
import { PermissionDeniedError } from "../auth/authorization";
import { createCustomer } from "../customers/model";
import { InMemoryCustomerStore } from "../customers/store";
import { InMemoryJobNumberCounterStore } from "../jobs/job-number";
import { InMemoryJobStore } from "../jobs/store";
import { testSession } from "../test/session";
import { createShop } from "../tenancy/model";
import { InMemoryShopStore } from "../tenancy/store";
import { createShopUser } from "../users/model";
import { InMemoryUserStore } from "../users/store";
import { createVehicle } from "../vehicles/model";
import { InMemoryVehicleStore } from "../vehicles/store";

import { createCheckIn, VehicleCustomerConflictError } from "./service";

async function buildFixture() {
  const shops = new InMemoryShopStore();
  const shop = createShop({
    name: "Auto Bros Garage",
    slug: "auto-bros-garage",
    jobNumberPrefix: "AB",
  });
  await shops.insert(shop);

  const users = new InMemoryUserStore();
  const technician = createShopUser({
    shopId: shop.id,
    role: "technician",
    displayName: "Brennan",
  });
  await users.insert(technician);

  const stores = {
    shops,
    users,
    customers: new InMemoryCustomerStore(),
    vehicles: new InMemoryVehicleStore(),
    jobs: new InMemoryJobStore(),
    jobNumberCounters: new InMemoryJobNumberCounterStore(),
    audit: new InMemoryAuditStore(),
  };
  return {
    shop,
    technician,
    stores,
    session: testSession("service_advisor", { shopId: shop.id }),
  };
}

describe("check-in service", () => {
  it("creates a customer, vehicle, and assigned job in one intake", async () => {
    const { session, technician, stores } = await buildFixture();

    const result = await createCheckIn(session, stores, {
      customer: {
        displayName: "Port City Auto Sales",
        phone: "225-555-2255",
        address: "Baton Rouge, LA",
        isDealer: true,
      },
      vehicle: {
        vin: "1FTFW1ET1EFA10234",
        year: 2021,
        make: "Ford",
        model: "F-150",
        mileage: 81234,
      },
      job: {
        complaint: "Diagnose check-engine light and rough idle.",
        lotNumber: "141",
        serviceMode: "dealer_site",
        serviceLocation: "Port City Auto Sales",
        assignedTechnicianId: technician.id,
      },
    });

    expect(result.createdCustomer).toBe(true);
    expect(result.createdVehicle).toBe(true);
    expect(result.customer).toMatchObject({ isDealer: true, pricingProfile: "wholesale" });
    expect(result.vehicle.customerId).toBe(result.customer.id);
    expect(result.job).toMatchObject({
      jobNumber: "AB-2026-000001",
      customerId: result.customer.id,
      vehicleId: result.vehicle.id,
      assignedTechnicianId: technician.id,
      serviceMode: "dealer_site",
      serviceLocation: "Port City Auto Sales",
      lotNumber: "141",
    });
    expect(stores.audit.events.map((event) => event.action)).toEqual([
      "customer.created",
      "vehicle.created",
      "job.created",
    ]);
  });

  it("reuses an existing customer and VIN while preserving service history", async () => {
    const { session, shop, stores } = await buildFixture();
    const customer = createCustomer({
      shopId: shop.id,
      type: "business",
      businessName: "Port City Auto Sales",
      isDealer: true,
    });
    await stores.customers.insert(customer);
    const vehicle = createVehicle({
      shopId: shop.id,
      customerId: customer.id,
      vin: "1FTFW1ET1EFA10234",
      mileage: 80000,
    });
    await stores.vehicles.insert(vehicle);

    const result = await createCheckIn(session, stores, {
      existingCustomerId: customer.id,
      vehicle: { vin: vehicle.vin, mileage: 81234 },
      job: { complaint: "Perform PSI.", serviceMode: "dealer_site", serviceLocation: "Port City" },
    });

    expect(result.createdCustomer).toBe(false);
    expect(result.createdVehicle).toBe(false);
    expect(result.vehicle.id).toBe(vehicle.id);
    expect(result.vehicle.mileage).toBe(81234);
    expect(result.job.vehicleId).toBe(vehicle.id);
  });

  it("blocks a VIN from being silently attached to a different customer", async () => {
    const { session, shop, stores } = await buildFixture();
    const first = createCustomer({ shopId: shop.id, type: "individual", firstName: "First" });
    const second = createCustomer({ shopId: shop.id, type: "individual", firstName: "Second" });
    await stores.customers.insert(first);
    await stores.customers.insert(second);
    await stores.vehicles.insert(
      createVehicle({
        shopId: shop.id,
        customerId: first.id,
        vin: "1FTFW1ET1EFA10234",
      }),
    );

    await expect(
      createCheckIn(session, stores, {
        existingCustomerId: second.id,
        vehicle: { vin: "1FTFW1ET1EFA10234" },
        job: { complaint: "Diagnose no-start." },
      }),
    ).rejects.toThrow(VehicleCustomerConflictError);
  });

  it("requires a location for mobile work", async () => {
    const { session, stores } = await buildFixture();

    await expect(
      createCheckIn(session, stores, {
        customer: { displayName: "Mobile Customer", isDealer: false },
        vehicle: { vin: "1FTFW1ET1EFA10234" },
        job: { complaint: "Install supplied part.", serviceMode: "mobile" },
      }),
    ).rejects.toThrow("Enter the mobile service address.");
  });

  it("keeps technician accounts from creating customers or opening jobs", async () => {
    const { shop, stores } = await buildFixture();

    await expect(
      createCheckIn(testSession("technician", { shopId: shop.id }), stores, {
        customer: { displayName: "Customer", isDealer: false },
        vehicle: { vin: "1FTFW1ET1EFA10234" },
        job: { complaint: "Diagnose warning light." },
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
