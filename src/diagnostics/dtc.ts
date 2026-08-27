import { randomUUID } from "node:crypto";

import { z } from "zod";

export const dtcStatuses = ["active", "pending", "history"] as const;
export type DtcStatus = (typeof dtcStatuses)[number];

/** Standard OBD-II style codes (P/B/C/U + 4 digits), permissive enough for manufacturer variants. */
export const dtcCodePattern = /^[PBCU][0-9A-F]{4}$/;

const dtcInputSchema = z.object({
  shopId: z.uuid(),
  diagnosticSessionId: z.uuid(),
  findingId: z.uuid().optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => dtcCodePattern.test(value), "Enter a valid DTC, e.g. P0301"),
  module: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(60).optional(),
  ),
  status: z.enum(dtcStatuses).optional(),
  description: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(1_000).optional(),
  ),
});

export type DtcRecordInput = z.input<typeof dtcInputSchema>;

export interface DtcRecord {
  id: string;
  shopId: string;
  diagnosticSessionId: string;
  findingId?: string;
  code: string;
  module?: string;
  status: DtcStatus;
  description?: string;
  recordedAt: Date;
  createdAt: Date;
}

/** Records a DTC read off the vehicle. Not yet linked to a finding until diagnosis narrows it down. */
export function recordDtc(input: DtcRecordInput): DtcRecord {
  const parsed = dtcInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    status: parsed.status ?? ("active" as const),
    recordedAt: now,
    createdAt: now,
  });
}

/** Links a previously-read DTC to the finding it turned out to explain. */
export function linkDtcToFinding(dtc: DtcRecord, findingId: string): DtcRecord {
  return Object.freeze({ ...dtc, findingId: z.uuid().parse(findingId) });
}
