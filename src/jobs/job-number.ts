import { and, eq, sql } from "drizzle-orm";

import type { Database } from "../db/client";
import { jobNumberCounters } from "../db/schema";

export interface JobNumberCounterStore {
  /** Atomically returns the next sequence number for a shop/year, starting at 1. */
  nextSequence(shopId: string, year: number): Promise<number>;
}

export class InMemoryJobNumberCounterStore implements JobNumberCounterStore {
  private readonly sequences = new Map<string, number>();

  async nextSequence(shopId: string, year: number): Promise<number> {
    const key = `${shopId}:${year}`;
    const next = (this.sequences.get(key) ?? 0) + 1;
    this.sequences.set(key, next);
    return next;
  }
}

/** Not unit-tested directly; exercised through integration/manual verification once wired to routes. */
export class DatabaseJobNumberCounterStore implements JobNumberCounterStore {
  constructor(private readonly database: Database) {}

  async nextSequence(shopId: string, year: number): Promise<number> {
    const [row] = await this.database
      .insert(jobNumberCounters)
      .values({ shopId, year, lastSequence: 1 })
      .onConflictDoUpdate({
        target: [jobNumberCounters.shopId, jobNumberCounters.year],
        set: { lastSequence: sql`${jobNumberCounters.lastSequence} + 1` },
      })
      .returning({ lastSequence: jobNumberCounters.lastSequence });

    if (row) return row.lastSequence;

    // Fallback for drivers that don't support RETURNING on upsert; re-read the row.
    const [current] = await this.database
      .select({ lastSequence: jobNumberCounters.lastSequence })
      .from(jobNumberCounters)
      .where(and(eq(jobNumberCounters.shopId, shopId), eq(jobNumberCounters.year, year)))
      .limit(1);
    return current?.lastSequence ?? 1;
  }
}

/** Formats an immutable, human-readable job number, e.g. "AB-2026-000001". */
export function formatJobNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function generateJobNumber(
  counters: JobNumberCounterStore,
  shopId: string,
  jobNumberPrefix: string,
  checkedInAt: Date,
): Promise<string> {
  const year = checkedInAt.getFullYear();
  const sequence = await counters.nextSequence(shopId, year);
  return formatJobNumber(jobNumberPrefix, year, sequence);
}
