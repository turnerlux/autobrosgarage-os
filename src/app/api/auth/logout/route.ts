import { NextResponse } from "next/server";

import { DatabaseAuthSessionStore } from "@/auth/credentials-store";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/auth/credentials-service";
import { getDatabase } from "@/db/client";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (token) {
    try {
      await new DatabaseAuthSessionStore(getDatabase()).revokeByTokenHash(
        hashSessionToken(decodeURIComponent(token)),
        new Date(),
      );
    } catch {
      // Cookie removal still succeeds if the database is temporarily unavailable.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
