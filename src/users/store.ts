import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { users } from "../db/schema";

import type { ShopUser } from "./model";

export interface UserStore {
  insert(user: ShopUser): Promise<void>;
  findById(shopId: string, id: string): Promise<ShopUser | null>;
  listActiveTechnicians(shopId: string): Promise<ShopUser[]>;
}

export class InMemoryUserStore implements UserStore {
  private readonly usersById = new Map<string, ShopUser>();

  async insert(user: ShopUser): Promise<void> {
    this.usersById.set(user.id, structuredClone(user));
  }

  async findById(shopId: string, id: string): Promise<ShopUser | null> {
    const user = this.usersById.get(id);
    return user && user.shopId === shopId ? structuredClone(user) : null;
  }

  async listActiveTechnicians(shopId: string): Promise<ShopUser[]> {
    return [...this.usersById.values()]
      .filter((user) => user.shopId === shopId && user.active && user.role === "technician")
      .map((user) => structuredClone(user))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}

/** Not unit-tested directly; exercised through integration/manual verification once wired to routes. */
export class DatabaseUserStore implements UserStore {
  constructor(private readonly database: Database) {}

  async insert(user: ShopUser): Promise<void> {
    await this.database.insert(users).values(user);
  }

  async findById(shopId: string, id: string): Promise<ShopUser | null> {
    const [row] = await this.database
      .select()
      .from(users)
      .where(and(eq(users.shopId, shopId), eq(users.id, id)))
      .limit(1);
    return (row as ShopUser | undefined) ?? null;
  }

  async listActiveTechnicians(shopId: string): Promise<ShopUser[]> {
    const rows = await this.database
      .select()
      .from(users)
      .where(and(eq(users.shopId, shopId), eq(users.active, true), eq(users.role, "technician")))
      .orderBy(asc(users.displayName));
    return rows as ShopUser[];
  }
}
