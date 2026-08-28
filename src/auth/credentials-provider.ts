import type { UserStore } from "../users/store";
import type { AuthSessionStore } from "./credentials-store";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./credentials-service";
import type { AuthenticationProvider } from "./provider";
import type { Session } from "./model";

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export class DatabaseCredentialsAuthenticationProvider implements AuthenticationProvider {
  constructor(
    private readonly sessions: AuthSessionStore,
    private readonly users: UserStore,
  ) {}

  async getSession(request: Request): Promise<Session | null> {
    const token = cookieValue(request, SESSION_COOKIE_NAME);
    if (!token) return null;

    const record = await this.sessions.findByTokenHash(hashSessionToken(token));
    const now = new Date();
    if (!record || record.revokedAt || record.expiresAt <= now) return null;

    const user = await this.users.findById(record.shopId, record.userId);
    if (!user?.active) return null;
    await this.sessions.touch(record.id, now);

    return {
      user: {
        id: user.id,
        shopId: user.shopId,
        role: user.role,
        displayName: user.displayName,
        active: user.active,
      },
      sessionId: record.id,
      authenticatedAt: record.createdAt,
    };
  }
}
