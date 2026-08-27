import { and, eq, ilike, or } from "drizzle-orm";

import type { Database } from "../db/client";
import { customers } from "../db/schema";

import type { Customer } from "./model";

export interface DuplicateCandidateQuery {
  displayName: string;
  phoneDigits?: string;
  email?: string;
}

export interface CustomerStore {
  insert(customer: Customer): Promise<void>;
  findById(shopId: string, id: string): Promise<Customer | null>;
  update(shopId: string, id: string, customer: Customer): Promise<void>;
  /** Loose matches used for duplicate-detection before creating a new record. */
  findPossibleDuplicates(shopId: string, query: DuplicateCandidateQuery): Promise<Customer[]>;
  /** Partial, case-insensitive search across name/phone/email for universal search. */
  search(shopId: string, queryText: string): Promise<Customer[]>;
}

export class InMemoryCustomerStore implements CustomerStore {
  private readonly customersById = new Map<string, Customer>();

  async insert(customer: Customer): Promise<void> {
    this.customersById.set(customer.id, structuredClone(customer));
  }

  async findById(shopId: string, id: string): Promise<Customer | null> {
    const customer = this.customersById.get(id);
    return customer && customer.shopId === shopId ? structuredClone(customer) : null;
  }

  async update(shopId: string, id: string, customer: Customer): Promise<void> {
    const existing = this.customersById.get(id);
    if (!existing || existing.shopId !== shopId) return;
    this.customersById.set(id, structuredClone(customer));
  }

  private forShop(shopId: string): Customer[] {
    return [...this.customersById.values()].filter((customer) => customer.shopId === shopId);
  }

  async findPossibleDuplicates(
    shopId: string,
    query: DuplicateCandidateQuery,
  ): Promise<Customer[]> {
    const normalizedName = query.displayName.trim().toLowerCase();
    return this.forShop(shopId).filter(
      (customer) =>
        customer.displayName.trim().toLowerCase() === normalizedName ||
        (query.phoneDigits && customer.phoneDigits === query.phoneDigits) ||
        (query.email && customer.email?.toLowerCase() === query.email.toLowerCase()),
    );
  }

  async search(shopId: string, queryText: string): Promise<Customer[]> {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return [];
    const digits = needle.replace(/\D/g, "");

    return this.forShop(shopId).filter(
      (customer) =>
        customer.displayName.toLowerCase().includes(needle) ||
        customer.email?.toLowerCase().includes(needle) ||
        (digits.length >= 3 && customer.phoneDigits?.includes(digits)),
    );
  }
}

/** Not unit-tested directly; exercised through integration/manual verification once wired to routes. */
export class DatabaseCustomerStore implements CustomerStore {
  constructor(private readonly database: Database) {}

  async insert(customer: Customer): Promise<void> {
    await this.database.insert(customers).values(customer);
  }

  async findById(shopId: string, id: string): Promise<Customer | null> {
    const [row] = await this.database
      .select()
      .from(customers)
      .where(and(eq(customers.shopId, shopId), eq(customers.id, id)))
      .limit(1);
    return (row as Customer | undefined) ?? null;
  }

  async update(shopId: string, id: string, customer: Customer): Promise<void> {
    await this.database
      .update(customers)
      .set(customer)
      .where(and(eq(customers.shopId, shopId), eq(customers.id, id)));
  }

  async findPossibleDuplicates(
    shopId: string,
    query: DuplicateCandidateQuery,
  ): Promise<Customer[]> {
    const conditions = [ilike(customers.displayName, query.displayName)];
    if (query.phoneDigits) conditions.push(eq(customers.phoneDigits, query.phoneDigits));
    if (query.email) conditions.push(ilike(customers.email, query.email));

    const rows = await this.database
      .select()
      .from(customers)
      .where(and(eq(customers.shopId, shopId), or(...conditions)));
    return rows as Customer[];
  }

  async search(shopId: string, queryText: string): Promise<Customer[]> {
    const pattern = `%${queryText.trim()}%`;
    const rows = await this.database
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.shopId, shopId),
          or(
            ilike(customers.displayName, pattern),
            ilike(customers.email, pattern),
            ilike(customers.phoneDigits, pattern),
          ),
        ),
      )
      .limit(20);
    return rows as Customer[];
  }
}
