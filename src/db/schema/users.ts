import { boolean, index, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { shops } from "./shops";

/**
 * Internal shop staff accounts. A managed authentication provider (Phase 0,
 * decision 0003) will eventually map an external identity to one of these
 * records; the provider identity is never sufficient by itself to grant a role.
 */
export const users = appSchema.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("users_shop_idx").on(table.shopId),
    uniqueIndex("users_shop_email_idx").on(table.shopId, table.email),
  ],
);
