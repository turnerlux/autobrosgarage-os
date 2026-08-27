import { randomUUID } from "node:crypto";

import { z } from "zod";

export const customerTypes = ["individual", "business"] as const;
export type CustomerType = (typeof customerTypes)[number];

/** Starter set. The pricing engine (Phase 6) will make this fully configurable per shop. */
export const pricingProfiles = ["standard", "wholesale", "fleet"] as const;
export type PricingProfile = (typeof pricingProfiles)[number];

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const billingAddressSchema = z
  .object({
    line1: z.string().trim().max(200).optional(),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
  })
  .optional();

const baseCustomerInputSchema = z.object({
  shopId: z.uuid(),
  type: z.enum(customerTypes),
  displayName: optionalText(160),
  firstName: optionalText(80),
  lastName: optionalText(80),
  businessName: optionalText(160),
  isDealer: z.boolean().default(false),
  phone: optionalText(40),
  email: z.preprocess((value) => (value === "" ? undefined : value), z.email().optional()),
  billingAddress: billingAddressSchema,
  notes: optionalText(2_000),
  pricingProfile: z.enum(pricingProfiles).default("standard"),
  createdBy: z.uuid().optional(),
});

const customerInputSchema = baseCustomerInputSchema
  .refine(
    (value) =>
      value.displayName ||
      (value.type === "individual" && (value.firstName || value.lastName)) ||
      (value.type === "business" && value.businessName),
    {
      message: "provide a display name, or a first/last name for an individual, or a business name",
      path: ["displayName"],
    },
  )
  .transform((value) => ({
    ...value,
    displayName:
      value.displayName ??
      (value.type === "business"
        ? value.businessName!
        : [value.firstName, value.lastName].filter(Boolean).join(" ")),
  }));

export type CustomerInput = z.input<typeof customerInputSchema>;

export interface Customer {
  id: string;
  shopId: string;
  type: CustomerType;
  displayName: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  isDealer: boolean;
  phone?: string;
  phoneDigits?: string;
  email?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  notes?: string;
  pricingProfile: PricingProfile;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Builds a validated customer record. Does not persist or check for duplicates. */
export function createCustomer(input: CustomerInput): Customer {
  const parsed = customerInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    phoneDigits: parsed.phone ? digitsOnly(parsed.phone) : undefined,
    createdAt: now,
    updatedAt: now,
  });
}

const customerUpdateSchema = baseCustomerInputSchema
  .omit({ shopId: true, type: true, createdBy: true })
  .partial();

export type CustomerUpdateInput = z.input<typeof customerUpdateSchema>;

/** Applies a partial update, recomputing derived fields (phoneDigits, updatedAt). */
export function applyCustomerUpdate(customer: Customer, input: CustomerUpdateInput): Customer {
  const parsed = customerUpdateSchema.parse(input);
  const merged: Customer = { ...customer, ...parsed, updatedAt: new Date() };
  merged.phoneDigits = merged.phone ? digitsOnly(merged.phone) : undefined;
  return Object.freeze(merged);
}
