import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { businessSettings } from "../db/schema";

import type { BusinessSettings } from "./model";

export interface BusinessSettingsStore {
  findByShop(shopId: string): Promise<BusinessSettings | null>;
  insert(settings: BusinessSettings): Promise<void>;
  update(shopId: string, settings: BusinessSettings): Promise<void>;
}

export class InMemoryBusinessSettingsStore implements BusinessSettingsStore {
  private readonly settingsByShopId = new Map<string, BusinessSettings>();

  async findByShop(shopId: string): Promise<BusinessSettings | null> {
    const found = this.settingsByShopId.get(shopId);
    return found ? structuredClone(found) : null;
  }

  async insert(settings: BusinessSettings): Promise<void> {
    this.settingsByShopId.set(settings.shopId, structuredClone(settings));
  }

  async update(shopId: string, settings: BusinessSettings): Promise<void> {
    const existing = this.settingsByShopId.get(shopId);
    if (!existing) return;
    this.settingsByShopId.set(shopId, structuredClone(settings));
  }
}

/** Not unit-tested directly; exercised through integration/manual verification once wired to routes. */
export class DatabaseBusinessSettingsStore implements BusinessSettingsStore {
  constructor(private readonly database: Database) {}

  async findByShop(shopId: string): Promise<BusinessSettings | null> {
    const [row] = await this.database
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.shopId, shopId))
      .limit(1);
    return (row as BusinessSettings | undefined) ?? null;
  }

  async insert(settings: BusinessSettings): Promise<void> {
    await this.database.insert(businessSettings).values(settings);
  }

  async update(shopId: string, settings: BusinessSettings): Promise<void> {
    await this.database
      .update(businessSettings)
      .set(settings)
      .where(and(eq(businessSettings.shopId, shopId), eq(businessSettings.id, settings.id)));
  }
}
