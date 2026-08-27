import { randomUUID } from "node:crypto";

import { z } from "zod";

export const testResults = ["pass", "fail", "inconclusive"] as const;
export type TestResult = (typeof testResults)[number];

const testInputSchema = z.object({
  shopId: z.uuid(),
  findingId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  /** Free text on purpose -- shop tests span voltages, pressures, resistances, and pass/fail
   *  checks with no common numeric shape. See schema comment in diagnostic-tests.ts. */
  measurementValue: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(200).optional(),
  ),
  expectedRange: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(200).optional(),
  ),
  result: z.enum(testResults),
  notes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(2_000).optional(),
  ),
  performedBy: z.uuid().optional(),
});

export type TestPerformedInput = z.input<typeof testInputSchema>;

export interface TestPerformed {
  id: string;
  shopId: string;
  findingId: string;
  name: string;
  measurementValue?: string;
  expectedRange?: string;
  result: TestResult;
  notes?: string;
  performedBy?: string;
  performedAt: Date;
  createdAt: Date;
}

/** Records a test performed while chasing a specific finding, with its result. */
export function recordTestPerformed(input: TestPerformedInput): TestPerformed {
  const parsed = testInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    performedAt: now,
    createdAt: now,
  });
}
