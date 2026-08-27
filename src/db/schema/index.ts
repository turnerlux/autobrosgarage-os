import { index, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Application-owned records live outside PostgreSQL's public schema. */
export const appSchema = pgSchema("app");

export const auditEvents = appSchema.table(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    shopId: uuid("shop_id").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    source: text("source").notNull(),
    approvalReference: text("approval_reference"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_shop_created_idx").on(table.shopId, table.createdAt),
    index("audit_events_shop_entity_idx").on(table.shopId, table.entityType, table.entityId),
  ],
);
