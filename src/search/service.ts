import { hasPermission } from "../auth/authorization";
import type { Session } from "../auth/model";
import type { Customer } from "../customers/model";
import type { CustomerStore } from "../customers/store";
import type { Job } from "../jobs/model";
import type { JobStore } from "../jobs/store";
import type { Vehicle } from "../vehicles/model";
import type { VehicleStore } from "../vehicles/store";

export interface UniversalSearchResult {
  customers: Customer[];
  vehicles: Vehicle[];
  jobs: Job[];
}

export interface SearchStores {
  customers: CustomerStore;
  vehicles: VehicleStore;
  jobs: JobStore;
}

/**
 * Fuzzy/partial-tolerant search across customers, vehicles, and jobs, scoped
 * to the caller's shop. Each category is gated by the caller's existing
 * read permission rather than a dedicated "search" permission, so a
 * technician (no customers:read) never sees customer or job-adjacent
 * customer detail through search that they couldn't see through direct
 * lookup. This is a deliberate least-privilege design choice: search must
 * never become a side door around the role permission matrix.
 */
export async function universalSearch(
  session: Session,
  stores: SearchStores,
  query: string,
): Promise<UniversalSearchResult> {
  const shopId = session.user.shopId;
  const trimmed = query.trim();
  if (!trimmed || !session.user.active) {
    return { customers: [], vehicles: [], jobs: [] };
  }

  const canReadCustomers = hasPermission(session.user.role, "customers:read");
  const canReadJobs = hasPermission(session.user.role, "jobs:read");

  const [customers, vehicles, jobs] = await Promise.all([
    canReadCustomers ? stores.customers.search(shopId, trimmed) : Promise.resolve([]),
    canReadJobs ? stores.vehicles.search(shopId, trimmed) : Promise.resolve([]),
    canReadJobs ? stores.jobs.search(shopId, trimmed) : Promise.resolve([]),
  ]);

  return { customers, vehicles, jobs };
}
