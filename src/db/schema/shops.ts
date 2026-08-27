import { text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";

/**
 * A shop is a tenant boundary. Every customer, vehicle, job, and downstream
 * record is scoped to exactly one shop so that unrelated shops on the same
 * platform can never see each other's data.
 */
export const shops = appSchema.table(
  "shops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Short uppercase prefix used to build human-readable job numbers, e.g. "AB". */
    jobNumberPrefix: text("job_number_prefix").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("shops_slug_idx").on(table.slug)],
);
