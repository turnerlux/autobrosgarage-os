import { randomUUID } from "node:crypto";

import { z } from "zod";

import { roles } from "../auth/model";

const userInputSchema = z.object({
  shopId: z.uuid(),
  role: z.enum(roles),
  displayName: z.string().trim().min(1).max(160),
  email: z
    .preprocess((value) => (value === "" ? undefined : value), z.email().optional())
    .optional(),
});

export type UserInput = z.input<typeof userInputSchema>;

export interface ShopUser {
  id: string;
  shopId: string;
  role: (typeof roles)[number];
  displayName: string;
  email?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Creates a new internal shop staff record. Owner/admin role changes are never autonomous. */
export function createShopUser(input: UserInput): ShopUser {
  const parsed = userInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}
