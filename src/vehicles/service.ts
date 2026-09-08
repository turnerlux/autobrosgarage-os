import { requireSameShop, requirePermission } from "../auth/authorization";
import type { Session } from "../auth/model";
import { createAuditEvent } from "../audit/model";
import type { AuditStore } from "../audit/store";
import type { CustomerStore } from "../customers/store";
import { ApplicationError } from "../lib/errors/public-error";

import { applyVehicleUpdate, createVehicle, type Vehicle, type VehicleInput } from "./model";
import type { VehicleStore } from "./store";

export interface CreateVehicleResult {
  vehicle: Vehicle;
  /** True when an existing vehicle with the same VIN was returned instead of creating a new one. */
  reused: boolean;
}

export async function createVehicleRecord(
  session: Session,
  stores: { vehicles: VehicleStore; audit: AuditStore },
  input: Omit<VehicleInput, "shopId" | "createdBy">,
  requestId?: string,
): Promise<CreateVehicleResult> {
  requirePermission(session, "customers:write");

  const draft = createVehicle({
    ...input,
    shopId: session.user.shopId,
    createdBy: session.user.id,
  });

  if (draft.vin) {
    const existing = await stores.vehicles.findByVin(session.user.shopId, draft.vin);
    if (existing) return { vehicle: existing, reused: true };
  }

  await stores.vehicles.insert(draft);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "vehicle.created",
      entityType: "vehicle",
      entityId: draft.id,
      after: draft,
      source: "web",
      requestId,
    }),
  );

  return { vehicle: draft, reused: false };
}

export async function getVehicleRecord(
  session: Session,
  stores: { vehicles: VehicleStore },
  vehicleId: string,
): Promise<Vehicle> {
  requirePermission(session, "customers:read");

  const vehicle = await stores.vehicles.findById(session.user.shopId, vehicleId);
  if (!vehicle) throw new ApplicationError("NOT_FOUND", "Vehicle not found", 404);
  requireSameShop(session, vehicle.shopId);

  return vehicle;
}

/**
 * Every vehicle already on file for one customer, newest first. This is the other half of the
 * returning-customer flow: `universalSearch` finds the person, this finds the cars they have
 * brought in before, so a repeat visit never re-types a VIN that is already in the database.
 * The customer is re-read through the same shop id first, so a customer id belonging to another
 * shop can never be used to enumerate that shop's vehicles.
 */
export async function listCustomerVehicles(
  session: Session,
  stores: { vehicles: VehicleStore; customers: CustomerStore },
  customerId: string,
): Promise<Vehicle[]> {
  requirePermission(session, "customers:read");
  const shopId = session.user.shopId;

  const customer = await stores.customers.findById(shopId, customerId);
  if (!customer) throw new ApplicationError("NOT_FOUND", "Customer not found", 404);
  requireSameShop(session, customer.shopId);

  return stores.vehicles.listByCustomer(shopId, customerId);
}

export async function updateVehicleRecord(
  session: Session,
  stores: { vehicles: VehicleStore; audit: AuditStore },
  vehicleId: string,
  patch: Parameters<typeof applyVehicleUpdate>[1],
  requestId?: string,
): Promise<Vehicle> {
  requirePermission(session, "customers:write");

  const existing = await stores.vehicles.findById(session.user.shopId, vehicleId);
  if (!existing) throw new ApplicationError("NOT_FOUND", "Vehicle not found", 404);
  requireSameShop(session, existing.shopId);

  const updated = applyVehicleUpdate(existing, patch);
  await stores.vehicles.update(session.user.shopId, vehicleId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "vehicle.updated",
      entityType: "vehicle",
      entityId: vehicleId,
      before: existing,
      after: updated,
      source: "web",
      requestId,
    }),
  );

  return updated;
}
