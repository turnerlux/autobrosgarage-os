import { requireSameShop, requirePermission } from "../auth/authorization";
import type { Session } from "../auth/model";
import { createAuditEvent } from "../audit/model";
import type { AuditStore } from "../audit/store";
import type { CustomerStore } from "../customers/store";
import { ApplicationError } from "../lib/errors/public-error";
import type { ShopStore } from "../tenancy/store";
import type { UserStore } from "../users/store";
import type { VehicleStore } from "../vehicles/store";

import { generateJobNumber, type JobNumberCounterStore } from "./job-number";
import { applyJobStatus, assignJobTechnician, createJob, type Job, type JobStatus } from "./model";
import type { JobStore } from "./store";

export interface JobStores {
  jobs: JobStore;
  jobNumberCounters: JobNumberCounterStore;
  shops: ShopStore;
  customers: CustomerStore;
  vehicles: VehicleStore;
  users: UserStore;
  audit: AuditStore;
}

export interface CreateJobInput {
  customerId: string;
  vehicleId: string;
  complaint: string;
  mileageAtCheckIn?: number;
  lotNumber?: string;
  assignedTechnicianId?: string;
}

export async function createJobRecord(
  session: Session,
  stores: JobStores,
  input: CreateJobInput,
  requestId?: string,
): Promise<Job> {
  requirePermission(session, "jobs:write");
  const shopId = session.user.shopId;

  const shop = await stores.shops.findById(shopId);
  if (!shop) throw new ApplicationError("NOT_FOUND", "Shop not found", 404);

  const customer = await stores.customers.findById(shopId, input.customerId);
  if (!customer) throw new ApplicationError("NOT_FOUND", "Customer not found", 404);
  requireSameShop(session, customer.shopId);

  const vehicle = await stores.vehicles.findById(shopId, input.vehicleId);
  if (!vehicle) throw new ApplicationError("NOT_FOUND", "Vehicle not found", 404);
  requireSameShop(session, vehicle.shopId);

  if (input.assignedTechnicianId) {
    const technician = await stores.users.findById(shopId, input.assignedTechnicianId);
    if (!technician || !technician.active) {
      throw new ApplicationError("BAD_REQUEST", "Assigned technician not found or inactive", 400);
    }
  }

  const checkedInAt = new Date();
  const jobNumber = await generateJobNumber(
    stores.jobNumberCounters,
    shopId,
    shop.jobNumberPrefix,
    checkedInAt,
  );

  const job = createJob({
    shopId,
    jobNumber,
    customerId: customer.id,
    vehicleId: vehicle.id,
    complaint: input.complaint,
    mileageAtCheckIn: input.mileageAtCheckIn,
    lotNumber: input.lotNumber,
    assignedTechnicianId: input.assignedTechnicianId,
    createdBy: session.user.id,
  });

  await stores.jobs.insert(job);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "job.created",
      entityType: "job",
      entityId: job.id,
      after: job,
      source: "web",
      requestId,
    }),
  );

  return job;
}

export async function getJobRecord(
  session: Session,
  stores: { jobs: JobStore },
  jobId: string,
): Promise<Job> {
  requirePermission(session, "jobs:read");

  const job = await stores.jobs.findById(session.user.shopId, jobId);
  if (!job) throw new ApplicationError("NOT_FOUND", "Job not found", 404);
  requireSameShop(session, job.shopId);

  return job;
}

/**
 * A vehicle's full job history, newest first -- what an owner's "show me everything we've
 * ever done to this car" AI command and a human service-history screen both need.
 * Requires `jobs:read` like any other job data; the vehicle lookup also enforces the same
 * tenant check so a vehicle id from another shop can never be used to pull job history.
 */
export async function getVehicleServiceHistory(
  session: Session,
  stores: { jobs: JobStore; vehicles: VehicleStore },
  vehicleId: string,
): Promise<Job[]> {
  requirePermission(session, "jobs:read");
  const shopId = session.user.shopId;

  const vehicle = await stores.vehicles.findById(shopId, vehicleId);
  if (!vehicle) throw new ApplicationError("NOT_FOUND", "Vehicle not found", 404);
  requireSameShop(session, vehicle.shopId);

  return stores.jobs.listByVehicle(shopId, vehicleId);
}

export async function updateJobStatus(
  session: Session,
  stores: { jobs: JobStore; audit: AuditStore },
  jobId: string,
  status: JobStatus,
  requestId?: string,
): Promise<Job> {
  requirePermission(session, "jobs:write");

  const existing = await stores.jobs.findById(session.user.shopId, jobId);
  if (!existing) throw new ApplicationError("NOT_FOUND", "Job not found", 404);
  requireSameShop(session, existing.shopId);

  const updated = applyJobStatus(existing, status);
  await stores.jobs.update(session.user.shopId, jobId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "job.status_changed",
      entityType: "job",
      entityId: jobId,
      before: { status: existing.status },
      after: { status: updated.status },
      source: "web",
      requestId,
    }),
  );

  return updated;
}

export async function assignTechnician(
  session: Session,
  stores: { jobs: JobStore; users: UserStore; audit: AuditStore },
  jobId: string,
  technicianId: string | undefined,
  requestId?: string,
): Promise<Job> {
  requirePermission(session, "jobs:write");
  const shopId = session.user.shopId;

  const existing = await stores.jobs.findById(shopId, jobId);
  if (!existing) throw new ApplicationError("NOT_FOUND", "Job not found", 404);
  requireSameShop(session, existing.shopId);

  if (technicianId) {
    const technician = await stores.users.findById(shopId, technicianId);
    if (!technician || !technician.active) {
      throw new ApplicationError("BAD_REQUEST", "Assigned technician not found or inactive", 400);
    }
  }

  const updated = assignJobTechnician(existing, technicianId);
  await stores.jobs.update(shopId, jobId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "job.assigned",
      entityType: "job",
      entityId: jobId,
      before: { assignedTechnicianId: existing.assignedTechnicianId },
      after: { assignedTechnicianId: updated.assignedTechnicianId },
      source: "web",
      requestId,
    }),
  );

  return updated;
}
