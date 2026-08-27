import { describe, expect, it } from "vitest";

import { recordTestPerformed } from "./test";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";
const findingId = "5f9f8732-e5bc-47db-b811-ffd67944dc96";

describe("tests performed", () => {
  it("records a passing measurement with free-text value and expected range", () => {
    const test = recordTestPerformed({
      shopId,
      findingId,
      name: "Fuel pressure test",
      measurementValue: "58 psi",
      expectedRange: "55-62 psi",
      result: "pass",
    });

    expect(test.result).toBe("pass");
    expect(test.measurementValue).toBe("58 psi");
  });

  it("records a failing test with no measurement value", () => {
    const test = recordTestPerformed({
      shopId,
      findingId,
      name: "Compression test cylinder 1",
      result: "fail",
      notes: "0 psi, suspect valve",
    });

    expect(test.result).toBe("fail");
    expect(test.measurementValue).toBeUndefined();
  });

  it("rejects an unrecognized result", () => {
    expect(() =>
      recordTestPerformed({
        shopId,
        findingId,
        name: "Fuel pressure test",
        // @ts-expect-error -- intentionally invalid result
        result: "maybe",
      }),
    ).toThrow();
  });
});
