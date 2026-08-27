import { requireSameShop, requirePermission } from "../auth/authorization";
import type { Session } from "../auth/model";
import { createAuditEvent } from "../audit/model";
import type { AuditStore } from "../audit/store";
import { ApplicationError } from "../lib/errors/public-error";

import { applyCustomerUpdate, createCustomer, type Customer, type CustomerInput } from "./model";
import type { CustomerStore } from "./store";

export interface CreateCustomerOptions {
  /** Set when the caller already reviewed and dismissed a duplicate warning. */
  confirmDuplicate?: boolean;
  requestId?: string;
}

export class PossibleDuplicateCustomerError extends ApplicationError {
  constructor(public readonly candidates: Customer[]) {
    super(
      "CONFLICT",
      "A similar customer already exists. Confirm before creating a new record.",
      409,
    );
    this.name = "PossibleDuplicateCustomerError";
  }
}

export async function createCustomerRecord(
  session: Session,
  stores: { customers: CustomerStore; audit: AuditStore },
  input: Omit<CustomerInput, "shopId" | "createdBy">,
  options: CreateCustomerOptions = {},
): Promise<Customer> {
  requirePermission(session, "customers:write");

  const draft = createCustomer({
    ...input,
    shopId: session.user.shopId,
    createdBy: session.user.id,
  });

  if (!options.confirmDuplicate) {
    const duplicates = await stores.customers.findPossibleDuplicates(session.user.shopId, {
      displayName: draft.displayName,
      phoneDigits: draft.phoneDigits,
      email: draft.email,
    });
    if (duplicates.length > 0) throw new PossibleDuplicateCustomerError(duplicates);
  }

  await stores.customers.insert(draft);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "customer.created",
      entityType: "customer",
      entityId: draft.id,
      after: draft,
      source: "web",
      requestId: options.requestId,
    }),
  );

  return draft;
}

export async function getCustomerRecord(
  session: Session,
  stores: { customers: CustomerStore },
  customerId: string,
): Promise<Customer> {
  requirePermission(session, "customers:read");

  const customer = await stores.customers.findById(session.user.shopId, customerId);
  if (!customer) throw new ApplicationError("NOT_FOUND", "Customer not found", 404);
  requireSameShop(session, customer.shopId);

  return customer;
}

export async function updateCustomerRecord(
  session: Session,
  stores: { customers: CustomerStore; audit: AuditStore },
  customerId: string,
  patch: Parameters<typeof applyCustomerUpdate>[1],
  requestId?: string,
): Promise<Customer> {
  requirePermission(session, "customers:write");

  const existing = await stores.customers.findById(session.user.shopId, customerId);
  if (!existing) throw new ApplicationError("NOT_FOUND", "Customer not found", 404);
  requireSameShop(session, existing.shopId);

  const updated = applyCustomerUpdate(existing, patch);
  await stores.customers.update(session.user.shopId, customerId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "customer.updated",
      entityType: "customer",
      entityId: customerId,
      before: existing,
      after: updated,
      source: "web",
      requestId,
    }),
  );

  return updated;
}
