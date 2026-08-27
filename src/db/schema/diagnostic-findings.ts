import { index, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { diagnosticSessions } from "./diagnostic-sessions";
import { shops } from "./shops";
import { users } from "./users";

/**
 * A single suspected/confirmed problem found during a diagnostic session.
 *
 * `technicianNote` is the technician's own words, recorded once and never overwritten —
 * it is the permanent record. `customerFacingSummary` is a separate, editable field for
 * a cleaned-up version shown to the customer (Phase 4 will draft it with AI; a human can
 * always write or edit it directly). Confirmation is deliberately not just another status
 * value on a generic update path — see `confirmedBy`/`confirmedAt` and the domain layer's
 * `confirmFinding`, the only way `status` may become `"confirmed"`.
 */
export const diagnosticFindings = appSchema.table(
  "diagnostic_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    diagnosticSessionId: uuid("diagnostic_session_id")
      .notNull()
      .references(() => diagnosticSessions.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("suspected"),
    technicianNote: text("technician_note").notNull(),
    customerFacingSummary: text("customer_facing_summary"),
    confirmedBy: uuid("confirmed_by").references(() => users.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("diagnostic_findings_shop_session_idx").on(table.shopId, table.diagnosticSessionId),
    index("diagnostic_findings_shop_status_idx").on(table.shopId, table.status),
  ],
);
