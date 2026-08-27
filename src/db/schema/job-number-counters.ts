import { integer, primaryKey, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { shops } from "./shops";

/**
 * One row per shop per calendar year. `lastSequence` is incremented
 * atomically (INSERT ... ON CONFLICT DO UPDATE) to hand out the next
 * immutable job number without ever reusing or skipping under concurrency.
 */
export const jobNumberCounters = appSchema.table(
  "job_number_counters",
  {
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    year: integer("year").notNull(),
    lastSequence: integer("last_sequence").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.shopId, table.year] })],
);
