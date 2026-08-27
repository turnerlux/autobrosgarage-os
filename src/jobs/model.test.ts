import { describe, expect, it } from "vitest";

import {
  applyJobStatus,
  assignJobTechnician,
  canTransitionJobStatus,
  createJob,
  InvalidJobStatusTransitionError,
} from "./model";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";
const customerId = "2f9f8732-e5bc-47db-b811-ffd67944dc93";
const vehicleId = "3f9f8732-e5bc-47db-b811-ffd67944dc94";

function job() {
  return createJob({
    shopId,
    jobNumber: "AB-2026-000001",
    customerId,
    vehicleId,
    complaint: "Check engine light on",
  });
}

describe("job records", () => {
  it("starts every job as checked_in", () => {
    expect(job().status).toBe("checked_in");
  });

  it("allows a normal forward status progression", () => {
    let current = applyJobStatus(job(), "awaiting_diagnosis");
    current = applyJobStatus(current, "diagnosing");
    current = applyJobStatus(current, "awaiting_estimate");
    expect(current.status).toBe("awaiting_estimate");
  });

  it("rejects skipping straight to paid_closed", () => {
    expect(() => applyJobStatus(job(), "paid_closed")).toThrow(InvalidJobStatusTransitionError);
  });

  it("allows moving to on_hold from any status and back", () => {
    const held = applyJobStatus(job(), "on_hold");
    expect(held.status).toBe("on_hold");
    expect(canTransitionJobStatus("on_hold", "diagnosing")).toBe(true);
  });

  it("never allows leaving paid_closed", () => {
    expect(canTransitionJobStatus("paid_closed", "on_hold")).toBe(false);
  });

  it("assigns and clears a technician", () => {
    const assigned = assignJobTechnician(job(), "tech-1");
    expect(assigned.assignedTechnicianId).toBe("tech-1");
    const cleared = assignJobTechnician(assigned, undefined);
    expect(cleared.assignedTechnicianId).toBeUndefined();
  });
});
