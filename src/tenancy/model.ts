import { randomUUID } from "node:crypto";

import { z } from "zod";

export const shopStatuses = ["active", "suspended"] as const;
export type ShopStatus = (typeof shopStatuses)[number];

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const prefixPattern = /^[A-Z]{2,6}$/;

const shopInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugPattern, "must contain only lowercase letters, numbers, and hyphens"),
  jobNumberPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(prefixPattern, "must be 2-6 uppercase letters"),
});

export type ShopInput = z.input<typeof shopInputSchema>;

export interface Shop {
  id: string;
  name: string;
  slug: string;
  jobNumberPrefix: string;
  status: ShopStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Creates a new tenant record. Shops are never deleted through the application layer. */
export function createShop(input: ShopInput): Shop {
  const parsed = shopInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  });
}
