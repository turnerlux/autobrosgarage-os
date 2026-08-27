import { randomUUID } from "node:crypto";

import { z } from "zod";

/**
 * Defaults pulled from AUTO_BROS_MASTER_SPEC.md section 12. These only seed a new shop's
 * first settings row -- once created, a row is never silently reset to these values, and
 * every change after that goes through `applyBusinessSettingsUpdate` with a version bump
 * and an audit event (see `../ai/tools/definitions.ts` callers and `service.ts`).
 */
export const DEFAULT_STANDARD_LABOR_RATE_CENTS = 12_500;
export const DEFAULT_DIAGNOSIS_FEE_CENTS = 12_500;

const businessSettingsPatchSchema = z.object({
  standardLaborRateCents: z.number().int().min(0).max(1_000_000).optional(),
  diagnosisFeeCents: z.number().int().min(0).max(1_000_000).optional(),
  warrantyPolicyText: z.string().trim().max(4_000).optional(),
  customerCommunicationNotes: z.string().trim().max(4_000).optional(),
});

export type BusinessSettingsPatch = z.infer<typeof businessSettingsPatchSchema>;

export interface BusinessSettings {
  id: string;
  shopId: string;
  /** Shop's standard hourly labor rate, in cents, used when an estimate does not override it. */
  standardLaborRateCents: number;
  /** Flat diagnosis fee, in cents, charged before a confirmed finding turns into repair work. */
  diagnosisFeeCents: number;
  warrantyPolicyText: string;
  customerCommunicationNotes: string;
  version: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBusinessSettingsInput {
  shopId: string;
  createdBy?: string;
  overrides?: BusinessSettingsPatch;
}

/** Seeds a shop's first settings row from the master-spec defaults, optionally overridden. */
export function createDefaultBusinessSettings(
  input: CreateBusinessSettingsInput,
): BusinessSettings {
  const overrides = businessSettingsPatchSchema.parse(input.overrides ?? {});
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    shopId: input.shopId,
    standardLaborRateCents: overrides.standardLaborRateCents ?? DEFAULT_STANDARD_LABOR_RATE_CENTS,
    diagnosisFeeCents: overrides.diagnosisFeeCents ?? DEFAULT_DIAGNOSIS_FEE_CENTS,
    warrantyPolicyText: overrides.warrantyPolicyText ?? "",
    customerCommunicationNotes: overrides.customerCommunicationNotes ?? "",
    version: 1,
    updatedBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

/** Applies a partial change, bumping `version` and stamping who made the change. */
export function applyBusinessSettingsUpdate(
  existing: BusinessSettings,
  patch: BusinessSettingsPatch,
  updatedBy: string,
): BusinessSettings {
  const parsed = businessSettingsPatchSchema.parse(patch);

  return Object.freeze({
    ...existing,
    ...parsed,
    version: existing.version + 1,
    updatedBy,
    updatedAt: new Date(),
  });
}

/**
 * Renders the current settings into plain-language business rules for the AI system
 * prompt. Kept deliberately simple (no templating engine) -- the point is that these
 * facts come from the database every time a prompt is assembled, never from what the
 * model "remembers" from an earlier turn.
 */
export function describeBusinessSettingsForPrompt(settings: BusinessSettings): string {
  const lines = [
    `Standard labor rate: $${(settings.standardLaborRateCents / 100).toFixed(2)} per hour.`,
    `Diagnosis fee: $${(settings.diagnosisFeeCents / 100).toFixed(2)} flat.`,
  ];
  if (settings.warrantyPolicyText) lines.push(`Warranty policy: ${settings.warrantyPolicyText}`);
  if (settings.customerCommunicationNotes) {
    lines.push(`Customer communication notes: ${settings.customerCommunicationNotes}`);
  }
  return lines.join("\n");
}
