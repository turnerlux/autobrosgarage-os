import { describe, expect, it } from "vitest";

import { maximumObjectBytes, ObjectTooLargeError, prepareObject } from "./model";
import {
  assertObjectBelongsToShop,
  ObjectStorageNotConfiguredError,
  UnconfiguredObjectStorage,
} from "./provider";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";

describe("private object preparation", () => {
  it("creates an opaque tenant-prefixed key and source hash", () => {
    const object = prepareObject({
      shopId,
      category: "diagnostic",
      fileName: "Customer Name scan report.PDF",
      contentType: "application/pdf",
      bytes: new TextEncoder().encode("scan report"),
    });

    expect(object.key).toMatch(new RegExp(`^shops/${shopId}/diagnostic/[a-f0-9-]+\\.pdf$`));
    expect(object.key).not.toContain("Customer");
    expect(object.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects unsupported and oversized uploads", () => {
    expect(() =>
      prepareObject({
        shopId,
        category: "document",
        fileName: "payload.html",
        contentType: "text/html",
        bytes: new Uint8Array([1]),
      }),
    ).toThrow("This file type is not supported");

    expect(() =>
      prepareObject({
        shopId,
        category: "document",
        fileName: "large.pdf",
        contentType: "application/pdf",
        bytes: new Uint8Array(maximumObjectBytes + 1),
      }),
    ).toThrow(ObjectTooLargeError);
  });

  it("denies cross-shop object access", () => {
    const storedObject = {
      shopId,
      key: `shops/${shopId}/intake/object.jpg`,
      contentType: "image/jpeg",
      byteLength: 1,
      sha256: "hash",
      storedAt: new Date(),
    };

    expect(() => assertObjectBelongsToShop(storedObject, crypto.randomUUID())).toThrow(
      "Object access denied",
    );
  });

  it("fails closed before a storage provider is configured", async () => {
    const storage = new UnconfiguredObjectStorage();
    await expect(storage.put()).rejects.toThrow(ObjectStorageNotConfiguredError);
  });
});
