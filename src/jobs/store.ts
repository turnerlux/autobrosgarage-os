import { and, eq, ilike, or } from "drizzle-orm";

import type { Database } from "../db/client";
import { jobs } from "../db/schema";

import type { Job } from "./model";

export interface JobStore {
  insert(job: Job): Promise<void>;
  findById(shopId: string, id: string): Promise<Job | null>;
  update(shopId: string, id: string, job: Job): Promise<void>;
  /** Partial, case-insensitive search across job number and lot number for universal search. */
  search(shopId: string, queryText: string): Promise<Job[]>;
}

export class InMemoryJobStore implements JobStore {
  private readonly jobsById = new Map<string, Job>();

  async insert(job: Job): Promise<void> {
    this.jobsById.set(job.id, structuredClone(job));
  }

  async findById(shopId: string, id: string): Promise<Job | null> {
    const job = this.jobsById.get(id);
    return job && job.shopId === shopId ? structuredClone(job) : null;
  }

  async update(shopId: string, id: string, job: Job): Promise<void> {
    const existing = this.jobsById.get(id);
    if (!existing || existing.shopId !== shopId) return;
    this.jobsById.set(id, structuredClone(job));
  }

  async search(shopId: string, queryText: string): Promise<Job[]> {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return [];

    return [...this.jobsById.values()].filter(
      (job) =>
        job.shopId === shopId &&
        (job.jobNumber.toLowerCase().includes(needle) ||
          job.lotNumber?.toLowerCase().includes(needle) ||
          job.complaint.toLowerCase().includes(needle)),
    );
  }
}

/** Not unit-tested directly; exercised through integration/manual verification once wired to routes. */
export class DatabaseJobStore implements JobStore {
  constructor(private readonly database: Database) {}

  async insert(job: Job): Promise<void> {
    await this.database.insert(jobs).values(job);
  }

  async findById(shopId: string, id: string): Promise<Job | null> {
    const [row] = await this.database
      .select()
      .from(jobs)
      .where(and(eq(jobs.shopId, shopId), eq(jobs.id, id)))
      .limit(1);
    return (row as Job | undefined) ?? null;
  }

  async update(shopId: string, id: string, job: Job): Promise<void> {
    await this.database
      .update(jobs)
      .set(job)
      .where(and(eq(jobs.shopId, shopId), eq(jobs.id, id)));
  }

  async search(shopId: string, queryText: string): Promise<Job[]> {
    const pattern = `%${queryText.trim()}%`;
    const rows = await this.database
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.shopId, shopId),
          or(ilike(jobs.jobNumber, pattern), ilike(jobs.lotNumber, pattern)),
        ),
      )
      .limit(20);
    return rows as Job[];
  }
}
