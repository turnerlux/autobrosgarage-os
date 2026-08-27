import { index, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { diagnosticFindings } from "./diagnostic-findings";
import { diagnosticSessions } from "./diagnostic-sessions";
import { shops } from "./shops";

/**
 * A DTC read from the vehicle during a session (e.g. from a scan tool). Recorded at the
 * session level as soon as it's read, then optionally linked to the finding it turns out
 * to explain once diagnosis narrows it down — `findingId` starts null.
 */
export const diagnosticTroubleCodes = appSchema.table(
  "diagnostic_trouble_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    diagnosticSessionId: uuid("diagnostic_session_id")
      .notNull()
      .references(() => diagnosticSessions.id, { onDelete: "restrict" }),
    findingId: uuid("finding_id").references(() => diagnosticFindings.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    module: text("module"),
    status: text("status").notNull().default("active"),
    description: text("description"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("diagnostic_trouble_codes_shop_session_idx").on(table.shopId, table.diagnosticSessionId),
    index("diagnostic_trouble_codes_shop_finding_idx").on(table.shopId, table.findingId),
    index("diagnostic_trouble_codes_shop_code_idx").on(table.shopId, table.code),
  ],
);
