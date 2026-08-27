import { describe, expect, it } from "vitest";

import { createCustomer } from "../customers/model";
import { InMemoryCustomerStore } from "../customers/store";
import { createJob } from "../jobs/model";
import { InMemoryJobStore } from "../jobs/store";
import { testSession } from "../test/session";
import { createVehicle } from "../vehicles/model";
import { InMemoryVehicleStore } from "../vehicles/store";

import { universalSearch } from "./service";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

async function buildFixture() {
  const customers = new InMemoryCustomerStore();
  const customer = createCustomer({
    shopId,
    type: "individual",
    firstName: "Brennan",
    lastName: "Doyle",
    phone: "225-555-0142",
  });
  await customers.insert(customer);

  const vehicles = new InMemoryVehicleStore();
  const vehicle = createVehicle({ shopId, vin: "1GNSKBE07DR123456" });
  await vehicles.insert(vehicle);

  const jobs = new InMemoryJobStore();
  const job = createJob({
    shopId,
    jobNumber: "AB-2026-000042",
    customerId: customer.id,
    vehicleId: vehicle.id,
    complaint: "Won't start",
    lotNumber: "L-12",
  });
  await jobs.insert(job);

  return { customer, vehicle, job, stores: { customers, vehicles, jobs } };
}

describe("universal search", () => {
  it("finds a customer by partial phone number", async () => {
    const { stores } = await buildFixture();
    const session = testSession("service_advisor", { shopId });

    const results = await universalSearch(session, stores, "5550142");
    expect(results.customers).toHaveLength(1);
  });

  it("finds a vehicle by partial VIN and a job by job number", async () => {
    const { stores } = await buildFixture();
    const session = testSession("service_advisor", { shopId });

    const byVin = await universalSearch(session, stores, "123456");
    expect(byVin.vehicles).toHaveLength(1);

    const byJobNumber = await universalSearch(session, stores, "AB-2026-000042");
    expect(byJobNumber.jobs).toHaveLength(1);
  });

  it("finds a job by lot number", async () => {
    const { stores } = await buildFixture();
    const session = testSession("owner", { shopId });

    const results = await universalSearch(session, stores, "L-12");
    expect(results.jobs).toHaveLength(1);
  });

  it("never returns customer results to a role without customers:read", async () => {
    const { stores } = await buildFixture();
    const technician = testSession("technician", { shopId });

    const results = await universalSearch(technician, stores, "Brennan");
    expect(results.customers).toHaveLength(0);
  });

  it("never returns cross-shop results", async () => {
    const { stores } = await buildFixture();
    const otherShopSession = testSession("owner", { shopId: "different-shop" });

    const results = await universalSearch(otherShopSession, stores, "Brennan");
    expect(results.customers).toHaveLength(0);
    expect(results.vehicles).toHaveLength(0);
    expect(results.jobs).toHaveLength(0);
  });

  it("returns nothing for an empty query", async () => {
    const { stores } = await buildFixture();
    const session = testSession("owner", { shopId });

    const results = await universalSearch(session, stores, "   ");
    expect(results).toEqual({ customers: [], vehicles: [], jobs: [] });
  });
});
