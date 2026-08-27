import { index, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { jobs } from "./jobs";
import { shops } from "./shops";
import { users } from "./users";

/**
 * One diagnostic session per round of investigation on a Job. A Job can have more than
 * one session over its life (e.g. a comeback reopens diagnosis), so sessions are never
 * reused or overwritten — a new session is opened instead.
 */
export const diagnosticSessions = appSchema.table(
  "diagnostic_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("open"),
    openedBy: uuid("opened_by").references(() => users.id, { onDelete: "set null" }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("diagnostic_sessions_shop_job_idx").on(table.shopId, table.jobId),
    index("diagnostic_sessions_shop_status_idx").on(table.shopId, table.status),
  ],
);
