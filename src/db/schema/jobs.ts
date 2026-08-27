import { index, integer, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { customers } from "./customers";
import { shops } from "./shops";
import { users } from "./users";
import { vehicles } from "./vehicles";

export const jobs = appSchema.table(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "restrict" }),
    /** Immutable human-readable identifier, e.g. "AB-2026-000001". Never reassigned. */
    jobNumber: text("job_number").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("checked_in"),
    complaint: text("complaint").notNull(),
    mileageAtCheckIn: integer("mileage_at_check_in"),
    lotNumber: text("lot_number"),
    assignedTechnicianId: uuid("assigned_technician_id").references(() => users.id, {
      onDelete: "set null",
    }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("jobs_shop_job_number_idx").on(table.shopId, table.jobNumber),
    index("jobs_shop_status_idx").on(table.shopId, table.status),
    index("jobs_shop_customer_idx").on(table.shopId, table.customerId),
    index("jobs_shop_vehicle_idx").on(table.shopId, table.vehicleId),
    index("jobs_shop_lot_idx").on(table.shopId, table.lotNumber),
    index("jobs_shop_technician_idx").on(table.shopId, table.assignedTechnicianId),
  ],
);
