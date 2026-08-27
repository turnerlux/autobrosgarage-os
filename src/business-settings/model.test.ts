import { describe, expect, it } from "vitest";

import {
  applyBusinessSettingsUpdate,
  createDefaultBusinessSettings,
  describeBusinessSettingsForPrompt,
  DEFAULT_DIAGNOSIS_FEE_CENTS,
  DEFAULT_STANDARD_LABOR_RATE_CENTS,
} from "./model";

const SHOP_ID = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

describe("createDefaultBusinessSettings", () => {
  it("seeds master-spec defaults when no overrides are given", () => {
    const settings = createDefaultBusinessSettings({ shopId: SHOP_ID });

    expect(settings.standardLaborRateCents).toBe(DEFAULT_STANDARD_LABOR_RATE_CENTS);
    expect(settings.diagnosisFeeCents).toBe(DEFAULT_DIAGNOSIS_FEE_CENTS);
    expect(settings.version).toBe(1);
    expect(settings.shopId).toBe(SHOP_ID);
  });

  it("accepts overrides for an initial seed", () => {
    const settings = createDefaultBusinessSettings({
      shopId: SHOP_ID,
      overrides: { standardLaborRateCents: 15_000 },
    });

    expect(settings.standardLaborRateCents).toBe(15_000);
    expect(settings.diagnosisFeeCents).toBe(DEFAULT_DIAGNOSIS_FEE_CENTS);
  });

  it("rejects a negative labor rate", () => {
    expect(() =>
      createDefaultBusinessSettings({ shopId: SHOP_ID, overrides: { standardLaborRateCents: -1 } }),
    ).toThrow();
  });
});

describe("applyBusinessSettingsUpdate", () => {
  it("bumps the version and stamps the updater on every change", () => {
    const original = createDefaultBusinessSettings({ shopId: SHOP_ID });
    const updated = applyBusinessSettingsUpdate(
      original,
      { standardLaborRateCents: 16_000 },
      "owner-user-id",
    );

    expect(updated.version).toBe(original.version + 1);
    expect(updated.updatedBy).toBe("owner-user-id");
    expect(updated.standardLaborRateCents).toBe(16_000);
    expect(updated.diagnosisFeeCents).toBe(original.diagnosisFeeCents);
  });

  it("leaves fields not present in the patch untouched", () => {
    const original = createDefaultBusinessSettings({
      shopId: SHOP_ID,
      overrides: { warrantyPolicyText: "12 months / 12,000 miles" },
    });
    const updated = applyBusinessSettingsUpdate(
      original,
      { diagnosisFeeCents: 9_900 },
      "owner-user-id",
    );

    expect(updated.warrantyPolicyText).toBe("12 months / 12,000 miles");
  });
});

describe("describeBusinessSettingsForPrompt", () => {
  it("renders rate and fee as dollars", () => {
    const settings = createDefaultBusinessSettings({ shopId: SHOP_ID });
    const description = describeBusinessSettingsForPrompt(settings);

    expect(description).toContain("$125.00 per hour");
    expect(description).toContain("$125.00 flat");
  });

  it("includes warranty and communication notes only when set", () => {
    const withoutNotes = createDefaultBusinessSettings({ shopId: SHOP_ID });
    expect(describeBusinessSettingsForPrompt(withoutNotes)).not.toContain("Warranty policy");

    const withNotes = createDefaultBusinessSettings({
      shopId: SHOP_ID,
      overrides: { warrantyPolicyText: "90 days parts and labor" },
    });
    expect(describeBusinessSettingsForPrompt(withNotes)).toContain(
      "Warranty policy: 90 days parts and labor",
    );
  });
});
