import { describe, expect, it } from "vitest";

import { InMemoryAuditStore } from "../audit/store";
import { createShop } from "../tenancy/model";
import { InMemoryShopStore } from "../tenancy/store";
import { createShopUser } from "../users/model";
import { InMemoryUserStore } from "../users/store";
import {
  InMemoryAuthSessionStore,
  InMemoryCredentialStore,
  type UserCredential,
} from "./credentials-store";
import { authenticateCredentials, InvalidCredentialsError } from "./credentials-service";
import { hashPassword } from "./password";

async function fixture(password = "ShopPass!2026") {
  const shops = new InMemoryShopStore();
  const users = new InMemoryUserStore();
  const credentials = new InMemoryCredentialStore();
  const sessions = new InMemoryAuthSessionStore();
  const audit = new InMemoryAuditStore();
  const shop = createShop({
    name: "Auto Bros Garage",
    slug: "auto-bros-garage",
    jobNumberPrefix: "AB",
  });
  const user = createShopUser({ shopId: shop.id, role: "owner", displayName: "Turner" });
  const now = new Date("2026-08-28T00:00:00Z");
  const credential: UserCredential = {
    userId: user.id,
    shopId: shop.id,
    username: "turner",
    passwordHash: await hashPassword(password),
    failedAttempts: 0,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await shops.insert(shop);
  await users.insert(user);
  await credentials.upsert(credential);
  return { shops, users, credentials, sessions, audit, shop, user, now };
}

describe("credential authentication", () => {
  it("creates a server-side session and audits a successful login", async () => {
    const stores = await fixture();
    const result = await authenticateCredentials(
      { username: "TURNER", password: "ShopPass!2026" },
      "auto-bros-garage",
      stores,
      stores.now,
    );

    expect(result.token.length).toBeGreaterThan(30);
    expect(result.session.user.displayName).toBe("Turner");
    expect(stores.audit.events.at(-1)?.action).toBe("auth.login_succeeded");
  });

  it("returns one generic error for unknown users and wrong passwords", async () => {
    const stores = await fixture();
    await expect(
      authenticateCredentials(
        { username: "turner", password: "WrongPass!2026" },
        "auto-bros-garage",
        stores,
        stores.now,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(
      authenticateCredentials(
        { username: "nobody", password: "WrongPass!2026" },
        "auto-bros-garage",
        stores,
        stores.now,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("temporarily locks a credential after five failures", async () => {
    const stores = await fixture();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        authenticateCredentials(
          { username: "turner", password: "WrongPass!2026" },
          "auto-bros-garage",
          stores,
          stores.now,
        ),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }

    const credential = await stores.credentials.findByUsername(stores.shop.id, "turner");
    expect(credential?.failedAttempts).toBe(5);
    expect(credential?.lockedUntil?.getTime()).toBeGreaterThan(stores.now.getTime());
  });
});
