import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";

export const objectCategories = [
  "intake",
  "inspection",
  "diagnostic",
  "repair",
  "receipt",
  "document",
] as const;

const allowedContentTypes = new Set([
  "application/pdf",
  "image/heic",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export const maximumObjectBytes = 25 * 1024 * 1024;

const uploadInputSchema = z.object({
  shopId: z.uuid(),
  category: z.enum(objectCategories),
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().min(1),
  bytes: z
    .custom<Uint8Array>(
      (value) => Object.prototype.toString.call(value) === "[object Uint8Array]",
      "invalid binary data",
    )
    .refine((bytes) => bytes.byteLength > 0, "file is empty"),
});

export type UploadInput = z.input<typeof uploadInputSchema>;

export interface PreparedObject {
  shopId: string;
  key: string;
  originalFileName: string;
  contentType: string;
  byteLength: number;
  sha256: string;
  bytes: Uint8Array;
}

export class UnsupportedContentTypeError extends Error {
  constructor() {
    super("This file type is not supported");
    this.name = "UnsupportedContentTypeError";
  }
}

export class ObjectTooLargeError extends Error {
  constructor() {
    super("This file exceeds the 25 MB upload limit");
    this.name = "ObjectTooLargeError";
  }
}

function safeExtension(fileName: string): string {
  const candidate = fileName.toLowerCase().match(/\.[a-z0-9]{1,10}$/)?.[0];
  return candidate ?? "";
}

export function prepareObject(input: UploadInput): PreparedObject {
  const parsed = uploadInputSchema.parse(input);
  if (!allowedContentTypes.has(parsed.contentType)) throw new UnsupportedContentTypeError();
  if (parsed.bytes.byteLength > maximumObjectBytes) throw new ObjectTooLargeError();

  const objectId = randomUUID();
  const extension = safeExtension(parsed.fileName);

  return Object.freeze({
    shopId: parsed.shopId,
    key: `shops/${parsed.shopId}/${parsed.category}/${objectId}${extension}`,
    originalFileName: parsed.fileName,
    contentType: parsed.contentType,
    byteLength: parsed.bytes.byteLength,
    sha256: createHash("sha256").update(parsed.bytes).digest("hex"),
    bytes: parsed.bytes,
  });
}
