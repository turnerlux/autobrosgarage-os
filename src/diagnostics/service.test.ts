import { describe, expect, it } from "vitest";

import { InMemoryAuditStore } from "../audit/store";
import { PermissionDeniedError } from "../auth/authorization";
import { createCustomer } from "../customers/model";
import { InMemoryCustomerStore } from "../customers/store";
import { InMemoryJobNumberCounterStore } from "../jobs/job-number";
import { createJobRecord } from "../jobs/service";
import { InMemoryJobStore } from "../jobs/store";
import { ApplicationError } from "../lib/errors/public-error";
import { testSession } from "../test/session";
import { createShop } from "../tenancy/model";
import { InMemoryShopStore } from "../tenancy/store";
import { InMemoryUserStore } from "../users/store";
import { createVehicle } from "../vehicles/model";
import { InMemoryVehicleStore } from "../vehicles/store";

import {
  addFindingRecord,
  attachDiagnosticMediaRecord,
  closeDiagnosticSessionRecord,
  confirmFindingRecord,
  getDiagnosticTimeline,
  linkDtcToFindingRecord,
  openDiagnosticSessionRecord,
  recordDtcRecord,
  recordTestRecord,
  setFindingCustomerSummaryRecord,
  updateFindingStatusRecord,
} from "./service";
import {
  InMemoryDiagnosticAttachmentStore,
  InMemoryDiagnosticSessionStore,
  InMemoryDtcStore,
  InMemoryFindingStore,
  InMemoryTestPerformedStore,
} from "./store";

async function buildFixture() {
  const shops = new InMemoryShopStore();
  const shop = createShop({ name: "Auto Bros Garage", slug: "auto-bros", jobNumberPrefix: "AB" });
  await shops.insert(shop);

  const advisorSession = testSession("service_advisor", { shopId: shop.id });
  const technicianSession = testSession("technician", {
    shopId: shop.id,
    userId: "6c1c7f2e-1a3b-4c9d-8e2f-6b7a5d4e3c11",
  });

  const customers = new InMemoryCustomerStore();
  const customer = createCustomer({ shopId: shop.id, type: "individual", firstName: "Sam" });
  await customers.insert(customer);

  const vehicles = new InMemoryVehicleStore();
  const vehicle = createVehicle({ shopId: shop.id, vin: "1GNSKBE07DR123456" });
  await vehicles.insert(vehicle);

  const jobStores = {
    jobs: new InMemoryJobStore(),
    jobNumberCounters: new InMemoryJobNumberCounterStore(),
    shops,
    customers,
    vehicles,
    users: new InMemoryUserStore(),
    audit: new InMemoryAuditStore(),
  };

  const job = await createJobRecord(advisorSession, jobStores, {
    customerId: customer.id,
    vehicleId: vehicle.id,
    complaint: "Won't start",
  });

  const stores = {
    sessions: new InMemoryDiagnosticSessionStore(),
    findings: new InMemoryFindingStore(),
    dtcs: new InMemoryDtcStore(),
    tests: new InMemoryTestPerformedStore(),
    attachments: new InMemoryDiagnosticAttachmentStore(),
    jobs: jobStores.jobs,
    audit: new InMemoryAuditStore(),
  };

  return { shop, job, advisorSession, technicianSession, stores };
}

describe("diagnostic service", () => {
  it("opens a session on a job and records an audit event", async () => {
    const { technicianSession, job, stores } = await buildFixture();

    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);

    expect(diagnosticSession.status).toBe("open");
    expect(diagnosticSession.jobId).toBe(job.id);
    expect(stores.audit.events[0]).toMatchObject({ action: "diagnostic_session.opened" });
  });

  it("rejects opening a session for a job in another shop", async () => {
    const { technicianSession, stores } = await buildFixture();

    await expect(
      openDiagnosticSessionRecord(
        technicianSession,
        stores,
        "00000000-0000-0000-0000-000000000000",
      ),
    ).rejects.toThrow(ApplicationError);
  });

  it("lets technicians add findings but not open Jobs (permission boundary from Phase 1 still holds)", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);

    const finding = await addFindingRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      technicianNote: "No spark on cylinder 1, coil pack suspected",
    });

    expect(finding.status).toBe("suspected");
    expect(finding.technicianNote).toContain("coil pack");
  });

  it("denies bookkeepers from writing diagnostics", async () => {
    const { job, shop, stores } = await buildFixture();
    const bookkeeperSession = testSession("bookkeeper", { shopId: shop.id });

    await expect(openDiagnosticSessionRecord(bookkeeperSession, stores, job.id)).rejects.toThrow(
      PermissionDeniedError,
    );
  });

  it("refuses to add findings once a session is closed", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);
    await closeDiagnosticSessionRecord(technicianSession, stores, diagnosticSession.id);

    await expect(
      addFindingRecord(technicianSession, stores, {
        diagnosticSessionId: diagnosticSession.id,
        technicianNote: "Too late",
      }),
    ).rejects.toThrow(ApplicationError);
  });

  it("moves a finding through testing before confirming it, with an explicit confirm step", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);
    const finding = await addFindingRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      technicianNote: "No spark on cylinder 1",
    });

    const testing = await updateFindingStatusRecord(
      technicianSession,
      stores,
      finding.id,
      "testing",
    );
    expect(testing.status).toBe("testing");

    const confirmed = await confirmFindingRecord(technicianSession, stores, finding.id);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.confirmedBy).toBe(technicianSession.user.id);
    expect(stores.audit.events.at(-1)).toMatchObject({ action: "diagnostic_finding.confirmed" });
  });

  it("sets a customer-facing summary independently of the technician note", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);
    const finding = await addFindingRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      technicianNote: "No spark on cylinder 1, coil pack suspected",
    });

    const updated = await setFindingCustomerSummaryRecord(
      technicianSession,
      stores,
      finding.id,
      "Ignition coil needs replacement.",
    );

    expect(updated.customerFacingSummary).toBe("Ignition coil needs replacement.");
    expect(updated.technicianNote).toBe(finding.technicianNote);
  });

  it("records a DTC and links it to the finding it explains", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);
    const finding = await addFindingRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      technicianNote: "No spark on cylinder 1",
    });

    const dtc = await recordDtcRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      code: "p0301",
      module: "PCM",
    });
    expect(dtc.code).toBe("P0301");
    expect(dtc.findingId).toBeUndefined();

    const linked = await linkDtcToFindingRecord(technicianSession, stores, dtc.id, finding.id);
    expect(linked.findingId).toBe(finding.id);
  });

  it("records a test performed against a finding", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);
    const finding = await addFindingRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      technicianNote: "No spark on cylinder 1",
    });

    const test = await recordTestRecord(technicianSession, stores, {
      findingId: finding.id,
      name: "Coil pack resistance test",
      measurementValue: "open circuit",
      result: "fail",
    });

    expect(test.result).toBe("fail");
    expect(test.performedBy).toBe(technicianSession.user.id);
  });

  it("attaches a photo to a session without storing bytes in the diagnostics tables", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);

    const attachment = await attachDiagnosticMediaRecord(
      technicianSession,
      stores,
      {
        diagnosticSessionId: diagnosticSession.id,
        kind: "photo",
        originalFileName: "coil-pack.jpg",
      },
      {
        key: `shops/${(await stores.sessions.findById(technicianSession.user.shopId, diagnosticSession.id))!.shopId}/diagnostic/coil.jpg`,
        contentType: "image/jpeg",
        byteLength: 102_400,
      },
    );

    expect(attachment.kind).toBe("photo");
    expect(attachment.contentType).toBe("image/jpeg");
  });

  it("assembles a combined timeline across the session, its findings, DTCs, and tests", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);
    const finding = await addFindingRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      technicianNote: "No spark on cylinder 1",
    });
    await recordDtcRecord(technicianSession, stores, {
      diagnosticSessionId: diagnosticSession.id,
      code: "P0301",
    });
    await recordTestRecord(technicianSession, stores, {
      findingId: finding.id,
      name: "Coil pack resistance test",
      result: "fail",
    });
    await confirmFindingRecord(technicianSession, stores, finding.id);

    const timeline = await getDiagnosticTimeline(technicianSession, stores, diagnosticSession.id);
    const actions = timeline.map((event) => event.action);

    expect(actions).toEqual([
      "diagnostic_session.opened",
      "diagnostic_finding.created",
      "diagnostic_trouble_code.recorded",
      "diagnostic_test.recorded",
      "diagnostic_finding.confirmed",
    ]);
  });

  it("never leaks another shop's diagnostic session", async () => {
    const { technicianSession, job, stores } = await buildFixture();
    const diagnosticSession = await openDiagnosticSessionRecord(technicianSession, stores, job.id);

    const otherShopSession = testSession("technician", {
      shopId: "9f9f8732-e5bc-47db-b811-ffd67944dc99",
    });

    await expect(
      addFindingRecord(otherShopSession, stores, {
        diagnosticSessionId: diagnosticSession.id,
        technicianNote: "Should never be reachable",
      }),
    ).rejects.toThrow(ApplicationError);
  });
});
