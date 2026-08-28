import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createShopUser } from "../users/model";
import { InMemoryUserStore } from "../users/store";
import { InMemoryAuthSessionStore } from "./credentials-store";
import { DatabaseCredentialsAuthenticationProvider } from "./credentials-provider";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./credentials-service";

describe("DatabaseCredentialsAuthenticationProvider", () => {
  it("maps a valid cookie to an active internal user", async () => {
    const users = new InMemoryUserStore();
    const sessions = new InMemoryAuthSessionStore();
    const user = createShopUser({
      shopId: randomUUID(),
      role: "technician",
      displayName: "Brennan",
    });
    const token = "a-valid-random-browser-session-token";
    const now = new Date();
    await users.insert(user);
    await sessions.insert({
      id: randomUUID(),
      shopId: user.shopId,
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(now.getTime() + 60_000),
      lastSeenAt: now,
      createdAt: now,
    });

    const provider = new DatabaseCredentialsAuthenticationProvider(sessions, users);
    const session = await provider.getSession(
      new Request("https://autobros.example", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` },
      }),
    );
    expect(session?.user).toMatchObject({ displayName: "Brennan", role: "technician" });
  });

  it("rejects a request without a session cookie", async () => {
    const provider = new DatabaseCredentialsAuthenticationProvider(
      new InMemoryAuthSessionStore(),
      new InMemoryUserStore(),
    );
    expect(await provider.getSession(new Request("https://autobros.example"))).toBeNull();
  });
});
