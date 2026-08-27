import { describe, expect, it } from "vitest";

import { PermissionDeniedError } from "../../auth/authorization";
import { InMemoryAuditStore } from "../../audit/store";
import { createCustomer } from "../../customers/model";
import { InMemoryCustomerStore } from "../../customers/store";
import { openDiagnosticSession } from "../../diagnostics/model";
import { InMemoryDiagnosticSessionStore, InMemoryFindingStore } from "../../diagnostics/store";
import { createJob } from "../../jobs/model";
import { InMemoryJobStore } from "../../jobs/store";
import { testSession } from "../../test/session";
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
    diagnosticSessions: new InMemoryDiagnosticSessionStore(),
    findings: new InMemoryFindingStore(),
    audit: new InMemoryAuditStore(),
  };
  const registry: ToolRegistry<AiToolContext> = createAiToolRegistry();
  return { context, registry };
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
