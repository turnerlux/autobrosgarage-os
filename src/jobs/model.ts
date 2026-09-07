import { randomUUID } from "node:crypto";

import { z } from "zod";

export const jobStatuses = [
  "checked_in",
  "awaiting_diagnosis",
  "diagnosing",
  "awaiting_estimate",
  "awaiting_customer_approval",
  "approved",
  "waiting_on_parts",
  "parts_received",
  "repairing",
  "quality_control",
  "ready_for_pickup",
  "invoiced",
  "paid_closed",
  "on_hold",
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const serviceModes = ["shop", "dealer_site", "mobile"] as const;
export type ServiceMode = (typeof serviceModes)[number];

const jobInputSchema = z.object({
  shopId: z.uuid(),
  jobNumber: z.string().trim().min(1).max(40),
  customerId: z.uuid(),
  vehicleId: z.uuid(),
  complaint: z.string().trim().min(1).max(4_000),
  mileageAtCheckIn: z.number().int().min(0).max(1_000_000).optional(),
  lotNumber: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(40).optional(),
  ),
  serviceMode: z.enum(serviceModes).default("shop"),
  serviceLocation: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(240).optional(),
  ),
  assignedTechnicianId: z.uuid().optional(),
  createdBy: z.uuid().optional(),
});

export type JobInput = z.input<typeof jobInputSchema>;

export interface Job {
  id: string;
  shopId: string;
  jobNumber: string;
  customerId: string;
  vehicleId: string;
  status: JobStatus;
  complaint: string;
  mileageAtCheckIn?: number;
  lotNumber?: string;
  serviceMode: ServiceMode;
  serviceLocation?: string;
  assignedTechnicianId?: string;
  checkedInAt: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Builds a validated job record with its immutable job number already assigned. */
export function createJob(input: JobInput): Job {
  const parsed = jobInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    status: "checked_in" as const,
    checkedInAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

const statusTransitions: Record<JobStatus, readonly JobStatus[]> = {
  checked_in: ["awaiting_diagnosis", "diagnosing", "on_hold"],
  awaiting_diagnosis: ["diagnosing", "on_hold"],
  diagnosing: ["awaiting_estimate", "on_hold"],
  awaiting_estimate: ["awaiting_customer_approval", "on_hold"],
  awaiting_customer_approval: ["approved", "on_hold"],
  approved: ["waiting_on_parts", "repairing", "on_hold"],
  waiting_on_parts: ["parts_received", "on_hold"],
  parts_received: ["repairing", "on_hold"],
  repairing: ["quality_control", "on_hold"],
  quality_control: ["ready_for_pickup", "repairing", "on_hold"],
  ready_for_pickup: ["invoiced", "on_hold"],
  invoiced: ["paid_closed", "on_hold"],
  paid_closed: [],
  on_hold: [
    "checked_in",
    "awaiting_diagnosis",
    "diagnosing",
    "awaiting_estimate",
    "awaiting_customer_approval",
    "approved",
    "waiting_on_parts",
    "parts_received",
    "repairing",
    "quality_control",
    "ready_for_pickup",
    "invoiced",
  ],
};

export class InvalidJobStatusTransitionError extends Error {
  constructor(from: JobStatus, to: JobStatus) {
    super(`Cannot move a job from "${from}" to "${to}"`);
    this.name = "InvalidJobStatusTransitionError";
  }
}

/** `on_hold` is reachable from and returns to any status, matching real shop interruptions. */
export function canTransitionJobStatus(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return false;
  return statusTransitions[from].includes(to);
}

export function applyJobStatus(job: Job, status: JobStatus): Job {
  if (!canTransitionJobStatus(job.status, status)) {
    throw new InvalidJobStatusTransitionError(job.status, status);
  }
  return Object.freeze({ ...job, status, updatedAt: new Date() });
}

export function assignJobTechnician(job: Job, assignedTechnicianId: string | undefined): Job {
  return Object.freeze({ ...job, assignedTechnicianId, updatedAt: new Date() });
}
