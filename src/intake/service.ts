import { z } from "zod";

import type { AuditStore } from "../audit/store";
import type { Session } from "../auth/model";
import { createCustomerRecord, getCustomerRecord } from "../customers/service";
import type { CustomerStore } from "../customers/store";
import type { Customer } from "../customers/model";
import { createJobRecord, type JobStores } from "../jobs/service";
import type { Job } from "../jobs/model";
import { ApplicationError } from "../lib/errors/public-error";
import { createVehicleRecord, updateVehicleRecord } from "../vehicles/service";
import type { Vehicle } from "../vehicles/model";
import type { VehicleStore } from "../vehicles/store";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const checkInInputSchema = z
  .object({
    existingCustomerId: z.uuid().optional(),
    customer: z
      .object({
        displayName: z.string().trim().min(1).max(160),
        phone: optionalText(40),
        email: z.preprocess((value) => (value === "" ? undefined : value), z.email().optional()),
        address: optionalText(200),
        isDealer: z.boolean().default(false),
        confirmDuplicate: z.boolean().default(false),
      })
      .optional(),
    vehicle: z.object({
      vin: optionalText(17),
      year: z
        .number()
        .int()
        .min(1900)
        .max(new Date().getFullYear() + 2)
        .optional(),
      make: optionalText(80),
      model: optionalText(80),
      mileage: z.number().int().min(0).max(1_000_000).optional(),
      licensePlate: optionalText(20),
    }),
    job: z.object({
      complaint: z.string().trim().min(1).max(4_000),
      lotNumber: optionalText(40),
      serviceMode: z.enum(["shop", "dealer_site", "mobile"]).default("shop"),
      serviceLocation: optionalText(240),
      assignedTechnicianId: z.uuid().optional(),
    }),
  })
  .refine((value) => value.existingCustomerId || value.customer, {
    message: "Choose an existing customer or enter a new customer.",
    path: ["customer"],
  })
  .refine(
    (value) =>
      value.vehicle.vin || (value.vehicle.year && value.vehicle.make && value.vehicle.model),
    {
      message: "Enter a VIN or the vehicle year, make, and model.",
      path: ["vehicle", "vin"],
    },
  )
  .refine((value) => value.job.serviceMode !== "mobile" || Boolean(value.job.serviceLocation), {
    message: "Enter the mobile service address.",
    path: ["job", "serviceLocation"],
  });

export type CheckInInput = z.input<typeof checkInInputSchema>;

export interface CheckInStores extends JobStores {
  customers: CustomerStore;
  vehicles: VehicleStore;
  audit: AuditStore;
}

export interface CheckInResult {
  customer: Customer;
  vehicle: Vehicle;
  job: Job;
  createdCustomer: boolean;
  createdVehicle: boolean;
}

export class VehicleCustomerConflictError extends ApplicationError {
  constructor(
    public readonly vehicle: Vehicle,
    public readonly existingCustomerId: string,
  ) {
    super(
      "CONFLICT",
      "That VIN is already saved under a different customer. Select the customer shown for that VIN before checking it in.",
      409,
    );
    this.name = "VehicleCustomerConflictError";
  }
}

/**
 * Creates one complete intake. Database callers must run this inside one transaction so a failed
 * duplicate or vehicle-owner check never leaves an incomplete customer or vehicle behind.
 */
export async function createCheckIn(
  session: Session,
  stores: CheckInStores,
  rawInput: CheckInInput,
  requestId?: string,
): Promise<CheckInResult> {
  const input = checkInInputSchema.parse(rawInput);

  let customer: Customer;
  let createdCustomer = false;
  if (input.existingCustomerId) {
    customer = await getCustomerRecord(session, stores, input.existingCustomerId);
  } else {
    const draft = input.customer!;
    customer = await createCustomerRecord(
      session,
      stores,
      {
        type: draft.isDealer ? "business" : "individual",
        displayName: draft.displayName,
        businessName: draft.isDealer ? draft.displayName : undefined,
        isDealer: draft.isDealer,
        phone: draft.phone,
        email: draft.email,
        billingAddress: draft.address ? { line1: draft.address } : undefined,
        pricingProfile: draft.isDealer ? "wholesale" : "standard",
      },
      { confirmDuplicate: draft.confirmDuplicate, requestId },
    );
    createdCustomer = true;
  }

  const vin = input.vehicle.vin?.toUpperCase();
  const existingVehicle = vin ? await stores.vehicles.findByVin(session.user.shopId, vin) : null;
  if (existingVehicle?.customerId && existingVehicle.customerId !== customer.id) {
    throw new VehicleCustomerConflictError(existingVehicle, existingVehicle.customerId);
  }

  let vehicle: Vehicle;
  let createdVehicle = false;
  if (existingVehicle) {
    vehicle = await updateVehicleRecord(
      session,
      stores,
      existingVehicle.id,
      {
        customerId: customer.id,
        ...(input.vehicle.year !== undefined ? { year: input.vehicle.year } : {}),
        ...(input.vehicle.make !== undefined ? { make: input.vehicle.make } : {}),
        ...(input.vehicle.model !== undefined ? { model: input.vehicle.model } : {}),
        ...(input.vehicle.mileage !== undefined ? { mileage: input.vehicle.mileage } : {}),
        ...(input.vehicle.licensePlate !== undefined
          ? { licensePlate: input.vehicle.licensePlate }
          : {}),
      },
      requestId,
    );
  } else {
    const result = await createVehicleRecord(
      session,
      stores,
      {
        customerId: customer.id,
        vin,
        year: input.vehicle.year,
        make: input.vehicle.make,
        model: input.vehicle.model,
        mileage: input.vehicle.mileage,
        licensePlate: input.vehicle.licensePlate,
      },
      requestId,
    );
    vehicle = result.vehicle;
    createdVehicle = !result.reused;
  }

  const job = await createJobRecord(
    session,
    stores,
    {
      customerId: customer.id,
      vehicleId: vehicle.id,
      complaint: input.job.complaint,
      mileageAtCheckIn: input.vehicle.mileage,
      lotNumber: input.job.lotNumber,
      serviceMode: input.job.serviceMode,
      serviceLocation: input.job.serviceLocation,
      assignedTechnicianId: input.job.assignedTechnicianId,
    },
    requestId,
  );

  return { customer, vehicle, job, createdCustomer, createdVehicle };
}
