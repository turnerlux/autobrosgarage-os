import { index, integer, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { customers } from "./customers";
import { shops } from "./shops";
import { users } from "./users";

export const vehicles = appSchema.table(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    vin: text("vin"),
    year: integer("year"),
    make: text("make"),
    model: text("model"),
    trim: text("trim"),
    engine: text("engine"),
    color: text("color"),
    licensePlate: text("license_plate"),
    mileage: integer("mileage"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vehicles_shop_idx").on(table.shopId),
    uniqueIndex("vehicles_shop_vin_idx").on(table.shopId, table.vin),
    index("vehicles_shop_customer_idx").on(table.shopId, table.customerId),
    index("vehicles_shop_ymm_idx").on(table.shopId, table.year, table.make, table.model),
  ],
);
