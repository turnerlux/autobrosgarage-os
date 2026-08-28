import { getDatabase } from "../db/client";
import { DatabaseUserStore } from "../users/store";
import { DatabaseAuthSessionStore } from "./credentials-store";
import { DatabaseCredentialsAuthenticationProvider } from "./credentials-provider";
import type { Session } from "./model";

export async function getRequestSession(request: Request): Promise<Session | null> {
  const database = getDatabase();
  const provider = new DatabaseCredentialsAuthenticationProvider(
    new DatabaseAuthSessionStore(database),
    new DatabaseUserStore(database),
  );
  return provider.getSession(request);
}
