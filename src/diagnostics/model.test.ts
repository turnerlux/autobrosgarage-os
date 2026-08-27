import { describe, expect, it } from "vitest";

import {
  closeDiagnosticSession,
  confirmFinding,
  createFinding,
  DiagnosticSessionClosedError,
  openDiagnosticSession,
  reopenDiagnosticSession,
  setCustomerFacingSummary,
  updateFindingStatus,
} from "./model";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";
const jobId = "2f9f8732-e5bc-47db-b811-ffd67944dc93";
const sessionId = "3f9f8732-e5bc-47db-b811-ffd67944dc94";
const technicianId = "4f9f8732-e5bc-47db-b811-ffd67944dc95";

function finding() {
  return createFinding({
    shopId,
    diagnosticSessionId: sessionId,
    technicianNote: "Cranks but no start, no spark on cylinder 1",
  });
}

describe("diagnostic sessions", () => {
  it("opens as open with no close time", () => {
    const session = openDiagnosticSession({ shopId, jobId, openedBy: technicianId });
    expect(session.status).toBe("open");
    expect(session.closedAt).toBeUndefined();
  });

  it("closes and records a close time", () => {
    const session = openDiagnosticSession({ shopId, jobId });
    const closed = closeDiagnosticSession(session);
    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBeInstanceOf(Date);
  });

  it("refuses to close an already-closed session", () => {
    const closed = closeDiagnosticSession(openDiagnosticSession({ shopId, jobId }));
    expect(() => closeDiagnosticSession(closed)).toThrow(DiagnosticSessionClosedError);
  });

  it("reopens a closed session and clears the close time", () => {
    const closed = closeDiagnosticSession(openDiagnosticSession({ shopId, jobId }));
    const reopened = reopenDiagnosticSession(closed);
    expect(reopened.status).toBe("open");
    expect(reopened.closedAt).toBeUndefined();
  });
});

describe("diagnostic findings", () => {
  it("always starts as suspected, never confirmed on creation", () => {
    expect(finding().status).toBe("suspected");
  });

  it("preserves the technician's note verbatim", () => {
    const note = "Cranks but no start, no spark on cylinder 1";
    expect(finding().technicianNote).toBe(note);
  });

  it("moves between non-confirmed statuses", () => {
    const testing = updateFindingStatus(finding(), "testing");
    expect(testing.status).toBe("testing");
    const ruledOut = updateFindingStatus(testing, "ruled_out");
    expect(ruledOut.status).toBe("ruled_out");
  });

  it("rejects setting confirmed through the generic status update", () => {
    // @ts-expect-error -- confirmed is intentionally excluded from the settable type
    expect(() => updateFindingStatus(finding(), "confirmed")).toThrow();
  });

  it("only confirms through confirmFinding, recording who and when", () => {
    const confirmed = confirmFinding(finding(), technicianId);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.confirmedBy).toBe(technicianId);
    expect(confirmed.confirmedAt).toBeInstanceOf(Date);
  });

  it("requires a valid actor id to confirm", () => {
    expect(() => confirmFinding(finding(), "not-a-uuid")).toThrow();
  });

  it("allows ruling out a previously confirmed finding", () => {
    const confirmed = confirmFinding(finding(), technicianId);
    const ruledOut = updateFindingStatus(confirmed, "ruled_out");
    expect(ruledOut.status).toBe("ruled_out");
  });

  it("sets and updates the customer-facing summary independently of the technician note", () => {
    const original = finding();
    const withSummary = setCustomerFacingSummary(original, "Ignition system needs repair.");
    expect(withSummary.customerFacingSummary).toBe("Ignition system needs repair.");
    expect(withSummary.technicianNote).toBe(original.technicianNote);
  });
});
