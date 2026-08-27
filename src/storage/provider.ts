import type { PreparedObject } from "./model";

export interface StoredObject {
  shopId: string;
  key: string;
  contentType: string;
  byteLength: number;
  sha256: string;
  storedAt: Date;
}

export interface SignedObjectAccess {
  url: URL;
  expiresAt: Date;
}

export interface PrivateObjectStorage {
  put(object: PreparedObject): Promise<StoredObject>;
  createReadAccess(object: StoredObject, lifetimeSeconds: number): Promise<SignedObjectAccess>;
}

export class ObjectStorageNotConfiguredError extends Error {
  constructor() {
    super("Private object storage has not been configured");
    this.name = "ObjectStorageNotConfiguredError";
  }
}

export class UnconfiguredObjectStorage implements PrivateObjectStorage {
  async put(): Promise<StoredObject> {
    throw new ObjectStorageNotConfiguredError();
  }

  async createReadAccess(): Promise<SignedObjectAccess> {
    throw new ObjectStorageNotConfiguredError();
  }
}

export function assertObjectBelongsToShop(object: StoredObject, shopId: string): void {
  if (object.shopId !== shopId || !object.key.startsWith(`shops/${shopId}/`)) {
    throw new Error("Object access denied");
  }
}
