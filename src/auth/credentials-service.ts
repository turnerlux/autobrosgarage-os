import { createHash, randomBytes, randomUUID } from "node:crypto";

import { z } from "zod";

import { createAuditEvent } from "../audit/model";
import type { AuditStore } from "../audit/store";
import type { ShopStore } from "../tenancy/store";
import type { UserStore } from "../users/store";
import type { Session } from "./model";
import { verifyPassword } from "./password";
import type { AuthSessionRecord, AuthSessionStore, CredentialStore } from "./credentials-store";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9._-]+$/),
  password: z.string().min(10).max(200),
});

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const FAILURE_LIMIT = 5;
const LOCK_MS = 15 * 60 * 1000;

export const SESSION_COOKIE_NAME = "autobros_session";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Username or password is incorrect");
    this.name = "InvalidCredentialsError";
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  session: Session;
}

export async function authenticateCredentials(
  input: unknown,
  shopSlug: string,
  stores: {
    shops: ShopStore;
    users: UserStore;
    credentials: CredentialStore;
    sessions: AuthSessionStore;
    audit: AuditStore;
  },
  now = new Date(),
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new InvalidCredentialsError();

  const shop = await stores.shops.findBySlug(shopSlug);
  if (!shop || shop.status !== "active") throw new InvalidCredentialsError();

  const credential = await stores.credentials.findByUsername(shop.id, parsed.data.username);
  if (!credential || (credential.lockedUntil && credential.lockedUntil > now)) {
    throw new InvalidCredentialsError();
  }

  const valid = await verifyPassword(parsed.data.password, credential.passwordHash);
  if (!valid) {
    const failedAttempts = credential.failedAttempts + 1;
    const lockedUntil =
      failedAttempts >= FAILURE_LIMIT ? new Date(now.getTime() + LOCK_MS) : undefined;
    await stores.credentials.recordFailure(credential.userId, failedAttempts, lockedUntil);
    await stores.audit.append(
      createAuditEvent({
        shopId: shop.id,
        actorType: "human",
        actorId: credential.userId,
        action: "auth.login_failed",
        entityType: "user",
        entityId: credential.userId,
        source: "web",
        reason: lockedUntil ? "Temporary lock after repeated failures" : "Invalid password",
      }),
    );
    throw new InvalidCredentialsError();
  }

  const user = await stores.users.findById(shop.id, credential.userId);
  if (!user?.active) throw new InvalidCredentialsError();

  await stores.credentials.resetFailures(user.id);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const record: AuthSessionRecord = {
    id: randomUUID(),
    shopId: shop.id,
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt,
    lastSeenAt: now,
    createdAt: now,
  };
  await stores.sessions.insert(record);
  await stores.audit.append(
    createAuditEvent({
      shopId: shop.id,
      actorType: "human",
      actorId: user.id,
      action: "auth.login_succeeded",
      entityType: "auth_session",
      entityId: record.id,
      source: "web",
    }),
  );

  return {
    token,
    expiresAt,
    session: {
      user: {
        id: user.id,
        shopId: user.shopId,
        role: user.role,
        displayName: user.displayName,
        active: user.active,
      },
      sessionId: record.id,
      authenticatedAt: now,
    },
  };
}
