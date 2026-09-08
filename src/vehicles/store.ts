import { and, desc, eq, ilike, or } from "drizzle-orm";

import type { Database } from "../db/client";
import { vehicles } from "../db/schema";

import type { Vehicle } from "./model";

export interface VehicleStore {
  insert(vehicle: Vehicle): Promise<void>;
  findById(shopId: string, id: string): Promise<Vehicle | null>;
  findByVin(shopId: string, vin: string): Promise<Vehicle | null>;
  update(shopId: string, id: string, vehicle: Vehicle): Promise<void>;
  /** Partial, case-insensitive search across VIN/year/make/model/plate for universal search. */
  search(shopId: string, queryText: string): Promise<Vehicle[]>;
  /** Every vehicle on file for one customer, newest first -- the returning-customer picker. */
  listByCustomer(shopId: string, customerId: string): Promise<Vehicle[]>;
}

export class InMemoryVehicleStore implements VehicleStore {
  private readonly vehiclesById = new Map<string, Vehicle>();

  async insert(vehicle: Vehicle): Promise<void> {
    this.vehiclesById.set(vehicle.id, structuredClone(vehicle));
  }

  async findById(shopId: string, id: string): Promise<Vehicle | null> {
    const vehicle = this.vehiclesById.get(id);
    return vehicle && vehicle.shopId === shopId ? structuredClone(vehicle) : null;
  }

  async findByVin(shopId: string, vin: string): Promise<Vehicle | null> {
    for (const vehicle of this.vehiclesById.values()) {
      if (vehicle.shopId === shopId && vehicle.vin === vin) return structuredClone(vehicle);
    }
    return null;
  }

  async update(shopId: string, id: string, vehicle: Vehicle): Promise<void> {
    const existing = this.vehiclesById.get(id);
    if (!existing || existing.shopId !== shopId) return;
    this.vehiclesById.set(id, structuredClone(vehicle));
  }

  async search(shopId: string, queryText: string): Promise<Vehicle[]> {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return [];

    return [...this.vehiclesById.values()].filter((vehicle) => {
      if (vehicle.shopId !== shopId) return false;
      const haystack = [
        vehicle.vin,
        vehicle.licensePlate,
        vehicle.year?.toString(),
        vehicle.make,
        vehicle.model,
        vehicle.trim,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  async listByCustomer(shopId: string, customerId: string): Promise<Vehicle[]> {
    return [...this.vehiclesById.values()]
      .filter((vehicle) => vehicle.shopId === shopId && vehicle.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((vehicle) => structuredClone(vehicle));
  }
}

/** Not unit-tested directly; exercised through integration/manual verification once wired to routes. */
export class DatabaseVehicleStore implements VehicleStore {
  constructor(private readonly database: Database) {}

  async insert(vehicle: Vehicle): Promise<void> {
    await this.database.insert(vehicles).values(vehicle);
  }

  async findById(shopId: string, id: string): Promise<Vehicle | null> {
    const [row] = await this.database
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.shopId, shopId), eq(vehicles.id, id)))
      .limit(1);
    return (row as Vehicle | undefined) ?? null;
  }

  async findByVin(shopId: string, vin: string): Promise<Vehicle | null> {
    const [row] = await this.database
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.shopId, shopId), eq(vehicles.vin, vin)))
      .limit(1);
    return (row as Vehicle | undefined) ?? null;
  }

  async update(shopId: string, id: string, vehicle: Vehicle): Promise<void> {
    await this.database
      .update(vehicles)
      .set(vehicle)
      .where(and(eq(vehicles.shopId, shopId), eq(vehicles.id, id)));
  }

  async search(shopId: string, queryText: string): Promise<Vehicle[]> {
    const pattern = `%${queryText.trim()}%`;
    const rows = await this.database
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.shopId, shopId),
          or(
            ilike(vehicles.vin, pattern),
            ilike(vehicles.make, pattern),
            ilike(vehicles.model, pattern),
            ilike(vehicles.licensePlate, pattern),
          ),
        ),
      )
      .limit(20);
    return rows as Vehicle[];
  }

  async listByCustomer(shopId: string, customerId: string): Promise<Vehicle[]> {
    const rows = await this.database
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.shopId, shopId), eq(vehicles.customerId, customerId)))
      .orderBy(desc(vehicles.createdAt));
    return rows as Vehicle[];
  }
}
