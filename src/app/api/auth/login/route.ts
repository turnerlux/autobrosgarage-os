import { NextResponse } from "next/server";

import { DatabaseAuditStore } from "@/audit/store";
import { DatabaseCredentialStore, DatabaseAuthSessionStore } from "@/auth/credentials-store";
import {
  authenticateCredentials,
  InvalidCredentialsError,
  SESSION_COOKIE_NAME,
} from "@/auth/credentials-service";
import { getDatabase } from "@/db/client";
import { getServerEnvironment } from "@/lib/env/server";
import { DatabaseShopStore } from "@/tenancy/store";
import { DatabaseUserStore } from "@/users/store";

export async function POST(request: Request) {
  try {
    const database = getDatabase();
    const environment = getServerEnvironment();
    const result = await authenticateCredentials(await request.json(), environment.AUTH_SHOP_SLUG, {
      shops: new DatabaseShopStore(database),
      users: new DatabaseUserStore(database),
      credentials: new DatabaseCredentialStore(database),
      sessions: new DatabaseAuthSessionStore(database),
      audit: new DatabaseAuditStore(database),
    });

    const response = NextResponse.json({
      user: {
        displayName: result.session.user.displayName,
        role: result.session.user.role,
      },
    });
    response.cookies.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(environment.APP_ORIGIN).protocol === "https:",
      path: "/",
      expires: result.expiresAt,
      priority: "high",
    });
    return response;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Sign-in is not available yet" }, { status: 503 });
  }
}
