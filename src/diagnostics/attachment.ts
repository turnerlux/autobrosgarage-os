import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { StoredObject } from "../storage/provider";

export const attachmentKinds = ["photo", "scan_report"] as const;
export type AttachmentKind = (typeof attachmentKinds)[number];

const attachmentInputSchema = z.object({
  shopId: z.uuid(),
  diagnosticSessionId: z.uuid(),
  findingId: z.uuid().optional(),
  kind: z.enum(attachmentKinds),
  originalFileName: z.string().trim().min(1).max(180),
  uploadedBy: z.uuid().optional(),
});

export type DiagnosticAttachmentInput = z.input<typeof attachmentInputSchema>;

export interface DiagnosticAttachment {
  id: string;
  shopId: string;
  diagnosticSessionId: string;
  findingId?: string;
  kind: AttachmentKind;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  byteLength: number;
  uploadedBy?: string;
  uploadedAt: Date;
}

/**
 * Links a diagnostic session (and optionally one finding) to a file already written
 * through `src/storage`. Never holds file bytes itself -- `storedObject` must be the
 * result of `PrivateObjectStorage.put(...)`, and its `shopId` is trusted as already
 * verified by the caller (mirrors `assertObjectBelongsToShop` in `src/storage/provider.ts`).
 */
export function attachDiagnosticMedia(
  input: DiagnosticAttachmentInput,
  storedObject: Pick<StoredObject, "key" | "contentType" | "byteLength">,
): DiagnosticAttachment {
  const parsed = attachmentInputSchema.parse(input);

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    objectKey: storedObject.key,
    contentType: storedObject.contentType,
    byteLength: storedObject.byteLength,
    uploadedAt: new Date(),
  });
}
