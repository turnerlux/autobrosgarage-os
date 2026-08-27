import { randomUUID } from "node:crypto";

import { z } from "zod";

/** Basic format check: 17 characters, excluding I/O/Q which VINs never use. Not a check-digit validator. */
const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;

const currentYear = new Date().getFullYear();

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const baseVehicleInputSchema = z.object({
  shopId: z.uuid(),
  customerId: z.uuid().optional(),
  vin: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.string().regex(vinPattern, "must be a valid 17-character VIN").optional(),
  ),
  year: z
    .number()
    .int()
    .min(1900)
    .max(currentYear + 2)
    .optional(),
  make: optionalText(80),
  model: optionalText(80),
  trim: optionalText(80),
  engine: optionalText(120),
  color: optionalText(60),
  licensePlate: optionalText(20),
  mileage: z.number().int().min(0).max(1_000_000).optional(),
  notes: optionalText(2_000),
  createdBy: z.uuid().optional(),
});

const vehicleInputSchema = baseVehicleInputSchema.refine(
  (value) => value.vin || (value.year && value.make && value.model),
  {
    message: "provide a VIN, or at least year, make, and model",
    path: ["vin"],
  },
);

export type VehicleInput = z.input<typeof vehicleInputSchema>;

export interface Vehicle {
  id: string;
  shopId: string;
  customerId?: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  color?: string;
  licensePlate?: string;
  mileage?: number;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Builds a validated vehicle record. Does not persist or check VIN uniqueness. */
export function createVehicle(input: VehicleInput): Vehicle {
  const parsed = vehicleInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    createdAt: now,
    updatedAt: now,
  });
}

const vehicleUpdateSchema = baseVehicleInputSchema
  .omit({ shopId: true, createdBy: true })
  .partial();

export type VehicleUpdateInput = z.input<typeof vehicleUpdateSchema>;

export function applyVehicleUpdate(vehicle: Vehicle, input: VehicleUpdateInput): Vehicle {
  const parsed = vehicleUpdateSchema.parse(input);
  return Object.freeze({ ...vehicle, ...parsed, updatedAt: new Date() });
}
