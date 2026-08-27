import { index, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { diagnosticFindings } from "./diagnostic-findings";
import { shops } from "./shops";
import { users } from "./users";

/**
 * A single test performed while chasing a specific finding (e.g. a fuel-pressure test).
 * `measurementValue`/`expectedRange` are free text rather than a number+unit pair: shop
 * tests span voltages, pressures, resistances, pass/fail scope checks, and more, and
 * forcing a single numeric shape would lose real readings technicians need to record.
 */
export const diagnosticTests = appSchema.table(
  "diagnostic_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => diagnosticFindings.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    measurementValue: text("measurement_value"),
    expectedRange: text("expected_range"),
    result: text("result").notNull(),
    notes: text("notes"),
    performedBy: uuid("performed_by").references(() => users.id, { onDelete: "set null" }),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("diagnostic_tests_shop_finding_idx").on(table.shopId, table.findingId)],
);
