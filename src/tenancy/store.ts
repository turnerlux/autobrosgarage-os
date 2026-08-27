import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { shops } from "../db/schema";

import type { Shop } from "./model";

export interface ShopStore {
  insert(shop: Shop): Promise<void>;
  findById(id: string): Promise<Shop | null>;
  findBySlug(slug: string): Promise<Shop | null>;
}

export class InMemoryShopStore implements ShopStore {
  private readonly shopsById = new Map<string, Shop>();

  async insert(shop: Shop): Promise<void> {
    this.shopsById.set(shop.id, structuredClone(shop));
  }

  async findById(id: string): Promise<Shop | null> {
    const shop = this.shopsById.get(id);
    return shop ? structuredClone(shop) : null;
  }

  async findBySlug(slug: string): Promise<Shop | null> {
    for (const shop of this.shopsById.values()) {
      if (shop.slug === slug) return structuredClone(shop);
    }
    return null;
  }
}

/** Not unit-tested directly; exercised through integration/manual verification once wired to routes. */
export class DatabaseShopStore implements ShopStore {
  constructor(private readonly database: Database) {}

  async insert(shop: Shop): Promise<void> {
    await this.database.insert(shops).values(shop);
  }

  async findById(id: string): Promise<Shop | null> {
    const [row] = await this.database.select().from(shops).where(eq(shops.id, id)).limit(1);
    return (row as Shop | undefined) ?? null;
  }

  async findBySlug(slug: string): Promise<Shop | null> {
    const [row] = await this.database.select().from(shops).where(eq(shops.slug, slug)).limit(1);
    return (row as Shop | undefined) ?? null;
  }
}
