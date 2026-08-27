import { describe, expect, it } from "vitest";

import { PermissionDeniedError } from "../../auth/authorization";
import { InMemoryAuditStore } from "../../audit/store";
import { createCustomer } from "../../customers/model";
import { InMemoryCustomerStore } from "../../customers/store";
import { openDiagnosticSession } from "../../diagnostics/model";
import { InMemoryDiagnosticSessionStore, InMemoryFindingStore } from "../../diagnostics/store";
import { InMemoryJobNumberCounterStore } from "../../jobs/job-number";
import { createJob } from "../../jobs/model";
import { InMemoryJobStore } from "../../jobs/store";
import { createShop } from "../../tenancy/model";
import { InMemoryShopStore } from "../../tenancy/store";
import { testSession } from "../../test/session";
import { createShopUser } from "../../users/model";
import { InMemoryUserStore } from "../../users/store";
import { createVehicle } from "../../vehicles/model";
import { InMemoryVehicleStore } from "../../vehicles/store";

import { createAiToolRegistry, type AiToolContext } from "./definitions";
import type { ToolRegistry } from "./registry";

const SHOP_ID = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

function buildFixture() {
  const context: AiToolContext = {
    customers: new InMemoryCustomerStore(),
    vehicles: new InMemoryVehicleStore(),
    jobs: new InMemoryJobStore(),
    jobNumberCounters: new InMemoryJobNumberCounterStore(),
    shops: new InMemoryShopStore(),
    users: new InMemoryUserStore(),
    diagnosticSessions: new InMemoryDiagnosticSessionStore(),
    findings: new InMemoryFindingStore(),
    audit: new InMemoryAuditStore(),
  };
  const registry: ToolRegistry<AiToolContext> = createAiToolRegistry();
  return { context, registry };
}

/** Fixture for tools that need a real, persisted shop -- job creation reads its
 * `jobNumberPrefix` to generate the next job number, so a bare shopId string isn't enough. */
async function buildShopFixture() {
  const { context, registry } = buildFixture();
  const shop = createShop({ name: "Auto Bros Garage", slug: "auto-bros", jobNumberPrefix: "AB" });
  await context.shops.insert(shop);

  const customer = createCustomer({ shopId: shop.id, type: "individual", firstName: "Morgan" });
  await context.customers.insert(customer);

  const vehicle = createVehicle({ shopId: shop.id, vin: "1GNSKBE07DR123456" });
  await context.vehicles.insert(vehicle);

  const technician = createShopUser({
    shopId: shop.id,
    role: "technician",
    displayName: "Alex Tech",
  });
  await context.users.insert(technician);

  return { context, registry, shop, customer, vehicle, technician };
}

describe("find_customer tool", () => {
  it("finds an existing customer by name within the caller's shop", async () => {
    const { context, registry } = buildFixture();
    const customer = createCustomer({ shopId: SHOP_ID, type: "individual", firstName: "Jordan" });
    await context.customers.insert(customer);

    const session = testSession("service_advisor", { shopId: SHOP_ID });
    const results = await registry.invoke(session, "find_customer", { query: "Jordan" }, context);

    expect(results).toEqual([customer]);
  });
});

describe("create_customer tool", () => {
  it("denies a technician, who has no customers:write permission", async () => {
    const { context, registry } = buildFixture();
    const technician = testSession("technician", { shopId: SHOP_ID });

    await expect(
      registry.invoke(
        technician,
        "create_customer",
        { type: "individual", firstName: "Sam" },
        context,
      ),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("creates a customer for a service advisor and records both audit layers", async () => {
    const { context, registry } = buildFixture();
    const advisor = testSession("service_advisor", { shopId: SHOP_ID });

    const created = (await registry.invoke(
      advisor,
      "create_customer",
      { type: "individual", firstName: "Riley", lastName: "Doe" },
      context,
    )) as { id: string; displayName: string };

    expect(created.displayName).toContain("Riley");
    const auditStore = context.audit as InMemoryAuditStore;
    expect(auditStore.events.some((event) => event.action === "customer.created")).toBe(true);
    expect(auditStore.events.some((event) => event.action === "ai_tool.invoked")).toBe(true);
  });
});

describe("get_service_history tool", () => {
  it("returns a vehicle's jobs", async () => {
    const { context, registry } = buildFixture();
    const vehicle = createVehicle({ shopId: SHOP_ID, vin: "1GNSKBE07DR123456" });
    await context.vehicles.insert(vehicle);
    const job = createJob({
      shopId: SHOP_ID,
      jobNumber: "AB-2026-000001",
      customerId: "9c1c7f2e-1a3b-4c9d-8e2f-6b7a5d4e3c10",
      vehicleId: vehicle.id,
      complaint: "Won't start",
    });
    await context.jobs.insert(job);

    const session = testSession("service_advisor", { shopId: SHOP_ID });
    const history = await registry.invoke(
      session,
      "get_service_history",
      { vehicleId: vehicle.id },
      context,
    );

    expect(history).toEqual([job]);
  });
});

describe("save_diagnostic_finding tool", () => {
  it("lets a technician record a Suspected finding on an open session", async () => {
    const { context, registry } = buildFixture();
    const job = createJob({
      shopId: SHOP_ID,
      jobNumber: "AB-2026-000002",
      customerId: "9c1c7f2e-1a3b-4c9d-8e2f-6b7a5d4e3c10",
      vehicleId: "9c1c7f2e-1a3b-4c9d-8e2f-6b7a5d4e3c11",
      complaint: "Check engine light",
    });
    await context.jobs.insert(job);
    const session = testSession("technician", { shopId: SHOP_ID });
    const diagnosticSession = openDiagnosticSession({
      shopId: SHOP_ID,
      jobId: job.id,
      openedBy: session.user.id,
    });
    await context.diagnosticSessions.insert(diagnosticSession);

    const finding = (await registry.invoke(
      session,
      "save_diagnostic_finding",
      { diagnosticSessionId: diagnosticSession.id, technicianNote: "P0300 misfire, cylinder 3" },
      context,
    )) as { status: string; technicianNote: string };

    expect(finding.status).toBe("suspected");
    expect(finding.technicianNote).toBe("P0300 misfire, cylinder 3");
  });
});

describe("create_vehicle tool", () => {
  it("creates a new vehicle for a service advisor", async () => {
    const { context, registry } = buildFixture();
    const session = testSession("service_advisor", { shopId: SHOP_ID });

    const result = (await registry.invoke(
      session,
      "create_vehicle",
      { vin: "1FTFW1ET1EFA00001" },
      context,
    )) as { vehicle: { vin?: string }; reused: boolean };

    expect(result.reused).toBe(false);
    expect(result.vehicle.vin).toBe("1FTFW1ET1EFA00001");
  });

  it("returns the existing vehicle instead of a duplicate when the VIN already exists", async () => {
    const { context, registry } = buildFixture();
    const existing = createVehicle({ shopId: SHOP_ID, vin: "1FTFW1ET1EFA00001" });
    await context.vehicles.insert(existing);
    const session = testSession("service_advisor", { shopId: SHOP_ID });

    const result = (await registry.invoke(
      session,
      "create_vehicle",
      { vin: "1FTFW1ET1EFA00001" },
      context,
    )) as { vehicle: { id: string }; reused: boolean };

    expect(result.reused).toBe(true);
    expect(result.vehicle.id).toBe(existing.id);
  });
});

describe("create_job tool", () => {
  it("denies a technician, who has no jobs:write permission", async () => {
    const { context, registry, customer, vehicle, shop } = await buildShopFixture();
    const technicianSession = testSession("technician", { shopId: shop.id });

    await expect(
      registry.invoke(
        technicianSession,
        "create_job",
        { customerId: customer.id, vehicleId: vehicle.id, complaint: "Won't start" },
        context,
      ),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("opens a job with a generated job number for a service advisor", async () => {
    const { context, registry, customer, vehicle, shop } = await buildShopFixture();
    const session = testSession("service_advisor", { shopId: shop.id });

    const job = (await registry.invoke(
      session,
      "create_job",
      { customerId: customer.id, vehicleId: vehicle.id, complaint: "Won't start" },
      context,
    )) as { jobNumber: string; status: string };

    expect(job.jobNumber).toMatch(/^AB-\d{4}-\d{6}$/);
    expect(job.status).toBe("checked_in");
  });
});

describe("update_job tool", () => {
  it("denies a technician, who has no jobs:write permission", async () => {
    const { context, registry, customer, vehicle, shop } = await buildShopFixture();
    const job = createJob({
      shopId: shop.id,
      jobNumber: "AB-2026-000001",
      customerId: customer.id,
      vehicleId: vehicle.id,
      complaint: "Won't start",
    });
    await context.jobs.insert(job);
    const technicianSession = testSession("technician", { shopId: shop.id });

    await expect(
      registry.invoke(
        technicianSession,
        "update_job",
        { jobId: job.id, status: "diagnosing" },
        context,
      ),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("moves a job to a new status and assigns a technician for a service advisor", async () => {
    const { context, registry, customer, vehicle, shop, technician } = await buildShopFixture();
    const job = createJob({
      shopId: shop.id,
      jobNumber: "AB-2026-000002",
      customerId: customer.id,
      vehicleId: vehicle.id,
      complaint: "Check engine light",
    });
    await context.jobs.insert(job);
    const session = testSession("service_advisor", { shopId: shop.id });

    const updated = (await registry.invoke(
      session,
      "update_job",
      { jobId: job.id, status: "diagnosing", assignedTechnicianId: technician.id },
      context,
    )) as { status: string; assignedTechnicianId?: string };

    expect(updated.status).toBe("diagnosing");
    expect(updated.assignedTechnicianId).toBe(technician.id);
  });

  it("rejects a status transition the job board itself would not allow", async () => {
    const { context, registry, customer, vehicle, shop } = await buildShopFixture();
    const job = createJob({
      shopId: shop.id,
      jobNumber: "AB-2026-000003",
      customerId: customer.id,
      vehicleId: vehicle.id,
      complaint: "Brake noise",
    });
    await context.jobs.insert(job);
    const session = testSession("service_advisor", { shopId: shop.id });

    // checked_in cannot jump straight to paid_closed.
    await expect(
      registry.invoke(session, "update_job", { jobId: job.id, status: "paid_closed" }, context),
    ).rejects.toThrow();
  });
});
