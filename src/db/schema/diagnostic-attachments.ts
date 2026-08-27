import { index, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appSchema } from "./app-schema";
import { diagnosticFindings } from "./diagnostic-findings";
import { diagnosticSessions } from "./diagnostic-sessions";
import { shops } from "./shops";
import { users } from "./users";

/**
 * Metadata for a photo or scan-report document attached during diagnosis. This table
 * never holds file bytes — it links a diagnostic session (and optionally one specific
 * finding) to an object already written through `src/storage`, keyed by `objectKey`.
 */
export const diagnosticAttachments = appSchema.table(
  "diagnostic_attachments",
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
    kind: text("kind").notNull(),
    objectKey: text("object_key").notNull(),
    originalFileName: text("original_file_name").notNull(),
    contentType: text("content_type").notNull(),
    byteLength: integer("byte_length").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("diagnostic_attachments_shop_session_idx").on(table.shopId, table.diagnosticSessionId),
    index("diagnostic_attachments_shop_finding_idx").on(table.shopId, table.findingId),
  ],
);
