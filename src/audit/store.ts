import { and, eq, or } from "drizzle-orm";

import type { Database } from "../db/client";
import { auditEvents } from "../db/schema";

import type { AuditEvent } from "./model";

/** One `entityType`/`entityId` pair to include when reading a combined timeline. */
export interface EntityRef {
  entityType: string;
  entityId: string;
}

export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
  /**
   * Every event for the given shop that matches any of `refs`, oldest first. Used to
   * assemble a combined timeline across related records (e.g. a diagnostic session and
   * its findings) without a bespoke history table per feature.
   */
  listForEntities(shopId: string, refs: EntityRef[]): Promise<AuditEvent[]>;
}

export class InMemoryAuditStore implements AuditStore {
  readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }

  async listForEntities(shopId: string, refs: EntityRef[]): Promise<AuditEvent[]> {
    if (refs.length === 0) return [];
    return this.events
      .filter(
        (event) =>
          event.shopId === shopId &&
          refs.some(
            (ref) => ref.entityType === event.entityType && ref.entityId === event.entityId,
          ),
      )
      .map((event) => structuredClone(event))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export class DatabaseAuditStore implements AuditStore {
  constructor(private readonly database: Database) {}

  async append(event: AuditEvent): Promise<void> {
    await this.database.insert(auditEvents).values(event);
  }

  async listForEntities(shopId: string, refs: EntityRef[]): Promise<AuditEvent[]> {
    if (refs.length === 0) return [];

    const rows = await this.database
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.shopId, shopId),
          or(
            ...refs.map((ref) =>
              and(
                eq(auditEvents.entityType, ref.entityType),
                eq(auditEvents.entityId, ref.entityId),
              ),
            ),
          ),
        ),
      )
      .orderBy(auditEvents.createdAt);
    return rows as AuditEvent[];
  }
}
