import { auditEvents } from "../db/schema";

import type { AuditEvent } from "./model";

export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
}

export class InMemoryAuditStore implements AuditStore {
  readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }
}

type AuditDatabase = {
  insert(table: typeof auditEvents): {
    values(values: typeof auditEvents.$inferInsert): PromiseLike<unknown>;
  };
};

export class DatabaseAuditStore implements AuditStore {
  constructor(private readonly database: AuditDatabase) {}

  async append(event: AuditEvent): Promise<void> {
    await this.database.insert(auditEvents).values(event);
  }
}
