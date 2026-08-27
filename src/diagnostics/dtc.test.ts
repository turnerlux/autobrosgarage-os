import { describe, expect, it } from "vitest";

import { linkDtcToFinding, recordDtc } from "./dtc";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";
const sessionId = "3f9f8732-e5bc-47db-b811-ffd67944dc94";
const findingId = "5f9f8732-e5bc-47db-b811-ffd67944dc96";

describe("DTC records", () => {
  it("normalizes the code to uppercase", () => {
    const dtc = recordDtc({ shopId, diagnosticSessionId: sessionId, code: "p0301" });
    expect(dtc.code).toBe("P0301");
  });

  it("defaults status to active and starts unlinked to a finding", () => {
    const dtc = recordDtc({ shopId, diagnosticSessionId: sessionId, code: "P0301" });
    expect(dtc.status).toBe("active");
    expect(dtc.findingId).toBeUndefined();
  });

  it("rejects a malformed code", () => {
    expect(() =>
      recordDtc({ shopId, diagnosticSessionId: sessionId, code: "not-a-code" }),
    ).toThrow();
  });

  it("links a DTC to the finding it explains", () => {
    const dtc = recordDtc({ shopId, diagnosticSessionId: sessionId, code: "P0301" });
    const linked = linkDtcToFinding(dtc, findingId);
    expect(linked.findingId).toBe(findingId);
  });
});
