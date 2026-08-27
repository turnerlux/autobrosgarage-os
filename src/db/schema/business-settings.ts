import { integer, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { shops } from "./shops";
import { users } from "./users";

/**
 * One row per shop. Holds the configurable business policy values (labor rate, diagnosis
 * fee, warranty language, etc.) that the AI system prompt and pricing/estimate features
 * read at runtime, so that business rules live in the database instead of in LLM memory
 * or hard-coded constants. See AUTO_BROS_MASTER_SPEC.md section 12 for the default values
 * this row is seeded from, and docs/decisions/0006-ai-model-provider-boundary.md for why
 * this exists ahead of any AI provider being connected.
 */
export const businessSettings = appSchema.table(
  "business_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    standardLaborRateCents: integer("standard_labor_rate_cents").notNull(),
    diagnosisFeeCents: integer("diagnosis_fee_cents").notNull(),
    warrantyPolicyText: text("warranty_policy_text").notNull().default(""),
    customerCommunicationNotes: text("customer_communication_notes").notNull().default(""),
    /** Incremented on every update so changes are unambiguous even without reading audit history. */
    version: integer("version").notNull().default(1),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("business_settings_shop_idx").on(table.shopId)],
);
