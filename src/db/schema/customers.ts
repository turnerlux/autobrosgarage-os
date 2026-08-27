import { boolean, index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { shops } from "./shops";
import { users } from "./users";

export const customers = appSchema.table(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    displayName: text("display_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    businessName: text("business_name"),
    isDealer: boolean("is_dealer").notNull().default(false),
    phone: text("phone"),
    /** Digits-only projection of `phone` so search tolerates formatting differences. */
    phoneDigits: text("phone_digits"),
    email: text("email"),
    billingAddress: jsonb("billing_address"),
    notes: text("notes"),
    pricingProfile: text("pricing_profile").notNull().default("standard"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customers_shop_idx").on(table.shopId),
    index("customers_shop_name_idx").on(table.shopId, table.displayName),
    index("customers_shop_phone_idx").on(table.shopId, table.phoneDigits),
    index("customers_shop_email_idx").on(table.shopId, table.email),
  ],
);
