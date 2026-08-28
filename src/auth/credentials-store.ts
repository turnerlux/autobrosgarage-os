import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { authSessions, userCredentials } from "../db/schema";

export interface UserCredential {
  userId: string;
  shopId: string;
  username: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionRecord {
  id: string;
  shopId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface CredentialStore {
  findByUsername(shopId: string, username: string): Promise<UserCredential | null>;
  upsert(credential: UserCredential): Promise<void>;
  recordFailure(userId: string, failedAttempts: number, lockedUntil?: Date): Promise<void>;
  resetFailures(userId: string): Promise<void>;
}

export interface AuthSessionStore {
  insert(session: AuthSessionRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;
  touch(id: string, seenAt: Date): Promise<void>;
  revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>;
}

export class InMemoryCredentialStore implements CredentialStore {
  private readonly records = new Map<string, UserCredential>();

  async findByUsername(shopId: string, username: string): Promise<UserCredential | null> {
    for (const record of this.records.values()) {
      if (record.shopId === shopId && record.username === username) return structuredClone(record);
    }
    return null;
  }

  async upsert(credential: UserCredential): Promise<void> {
    this.records.set(credential.userId, structuredClone(credential));
  }

  async recordFailure(userId: string, failedAttempts: number, lockedUntil?: Date): Promise<void> {
    const record = this.records.get(userId);
    if (!record) return;
    this.records.set(userId, { ...record, failedAttempts, lockedUntil, updatedAt: new Date() });
  }

  async resetFailures(userId: string): Promise<void> {
    const record = this.records.get(userId);
    if (!record) return;
    this.records.set(userId, {
      ...record,
      failedAttempts: 0,
      lockedUntil: undefined,
      updatedAt: new Date(),
    });
  }
}

export class InMemoryAuthSessionStore implements AuthSessionStore {
  private readonly records = new Map<string, AuthSessionRecord>();

  async insert(session: AuthSessionRecord): Promise<void> {
    this.records.set(session.tokenHash, structuredClone(session));
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null> {
    const record = this.records.get(tokenHash);
    return record ? structuredClone(record) : null;
  }

  async touch(id: string, seenAt: Date): Promise<void> {
    for (const [tokenHash, record] of this.records) {
      if (record.id === id) this.records.set(tokenHash, { ...record, lastSeenAt: seenAt });
    }
  }

  async revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    const record = this.records.get(tokenHash);
    if (record) this.records.set(tokenHash, { ...record, revokedAt });
  }
}

export class DatabaseCredentialStore implements CredentialStore {
  constructor(private readonly database: Database) {}

  async findByUsername(shopId: string, username: string): Promise<UserCredential | null> {
    const [row] = await this.database
      .select()
      .from(userCredentials)
      .where(and(eq(userCredentials.shopId, shopId), eq(userCredentials.username, username)))
      .limit(1);
    return (row as UserCredential | undefined) ?? null;
  }

  async upsert(credential: UserCredential): Promise<void> {
    await this.database
      .insert(userCredentials)
      .values(credential)
      .onConflictDoUpdate({
        target: userCredentials.userId,
        set: {
          username: credential.username,
          passwordHash: credential.passwordHash,
          failedAttempts: credential.failedAttempts,
          lockedUntil: credential.lockedUntil,
          passwordChangedAt: credential.passwordChangedAt,
          updatedAt: credential.updatedAt,
        },
      });
  }

  async recordFailure(userId: string, failedAttempts: number, lockedUntil?: Date): Promise<void> {
    await this.database
      .update(userCredentials)
      .set({ failedAttempts, lockedUntil, updatedAt: new Date() })
      .where(eq(userCredentials.userId, userId));
  }

  async resetFailures(userId: string): Promise<void> {
    await this.database
      .update(userCredentials)
      .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(userCredentials.userId, userId));
  }
}

export class DatabaseAuthSessionStore implements AuthSessionStore {
  constructor(private readonly database: Database) {}

  async insert(session: AuthSessionRecord): Promise<void> {
    await this.database.insert(authSessions).values(session);
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null> {
    const [row] = await this.database
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);
    return (row as AuthSessionRecord | undefined) ?? null;
  }

  async touch(id: string, seenAt: Date): Promise<void> {
    await this.database
      .update(authSessions)
      .set({ lastSeenAt: seenAt })
      .where(eq(authSessions.id, id));
  }

  async revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.database
      .update(authSessions)
      .set({ revokedAt })
      .where(eq(authSessions.tokenHash, tokenHash));
  }
}
