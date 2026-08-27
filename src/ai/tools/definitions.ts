import { z } from "zod";

import type { AuditStore } from "../../audit/store";
import { customerTypes, pricingProfiles } from "../../customers/model";
import { createCustomerRecord } from "../../customers/service";
import type { CustomerStore } from "../../customers/store";
import { addFindingRecord } from "../../diagnostics/service";
import type { DiagnosticSessionStore, FindingStore } from "../../diagnostics/store";
import type { JobNumberCounterStore } from "../../jobs/job-number";
import {
  assignTechnician,
  createJobRecord,
  getJobRecord,
  getVehicleServiceHistory,
  updateJobStatus,
} from "../../jobs/service";
import { jobStatuses } from "../../jobs/model";
import type { JobStore } from "../../jobs/store";
import type { ShopStore } from "../../tenancy/store";
import type { UserStore } from "../../users/store";
import { vinPattern } from "../../vehicles/model";
import { createVehicleRecord } from "../../vehicles/service";
import type { VehicleStore } from "../../vehicles/store";

import { ToolRegistry, type ToolDefinition } from "./registry";

/**
 * Everything a tool handler is allowed to touch. Deliberately the same shape as the
 * `*Stores` objects each Phase 1/3 service already takes -- a tool handler's job is to
 * translate AI-shaped arguments into a call to the real service, not to reimplement
 * business logic against the stores directly.
 */
export interface AiToolContext {
  customers: CustomerStore;
  vehicles: VehicleStore;
  jobs: JobStore;
  jobNumberCounters: JobNumberCounterStore;
  shops: ShopStore;
  users: UserStore;
  diagnosticSessions: DiagnosticSessionStore;
  findings: FindingStore;
  audit: AuditStore;
}

const findCustomerTool: ToolDefinition<{ query: string }, unknown, AiToolContext> = {
  name: "find_customer",
  description: "Search for existing customers by name, phone, or email within the caller's shop.",
  permission: "customers:read",
  parameters: z.object({ query: z.string().trim().min(1).max(200) }),
  handler: async (session, context, params) =>
    context.customers.search(session.user.shopId, params.query),
};

const findVehicleTool: ToolDefinition<{ query: string }, unknown, AiToolContext> = {
  name: "find_vehicle",
  description: "Search for existing vehicles by VIN, plate, year, make, or model.",
  permission: "customers:read",
  parameters: z.object({ query: z.string().trim().min(1).max(200) }),
  handler: async (session, context, params) =>
    context.vehicles.search(session.user.shopId, params.query),
};

const getServiceHistoryTool: ToolDefinition<{ vehicleId: string }, unknown, AiToolContext> = {
  name: "get_service_history",
  description: "List every job on record for a vehicle, newest first.",
  permission: "jobs:read",
  parameters: z.object({ vehicleId: z.uuid() }),
  handler: async (session, context, params) =>
    getVehicleServiceHistory(
      session,
      { jobs: context.jobs, vehicles: context.vehicles },
      params.vehicleId,
    ),
};

const createCustomerParams = z.object({
  type: z.enum(customerTypes),
  displayName: z.string().trim().max(160).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  businessName: z.string().trim().max(160).optional(),
  isDealer: z.boolean().optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.email().optional(),
  notes: z.string().trim().max(2_000).optional(),
  pricingProfile: z.enum(pricingProfiles).optional(),
  /** Set true only after a human has already reviewed and dismissed a duplicate warning. */
  confirmDuplicate: z.boolean().optional(),
});

const createCustomerTool: ToolDefinition<
  z.infer<typeof createCustomerParams>,
  unknown,
  AiToolContext
> = {
  name: "create_customer",
  description:
    "Create a new customer record. Raises a conflict if a similar customer already exists, " +
    "unless confirmDuplicate is set after a human has reviewed the match.",
  permission: "customers:write",
  parameters: createCustomerParams,
  handler: async (session, context, params) => {
    const { confirmDuplicate, ...input } = params;
    return createCustomerRecord(
      session,
      { customers: context.customers, audit: context.audit },
      input,
      {
        confirmDuplicate,
      },
    );
  },
};

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const createVehicleParams = z.object({
  customerId: z.uuid().optional(),
  vin: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.string().regex(vinPattern, "must be a valid 17-character VIN").optional(),
  ),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 2)
    .optional(),
  make: optionalText(80),
  model: optionalText(80),
  trim: optionalText(80),
  engine: optionalText(120),
  color: optionalText(60),
  licensePlate: optionalText(20),
  mileage: z.number().int().min(0).max(1_000_000).optional(),
  notes: optionalText(2_000),
});

const createVehicleTool: ToolDefinition<
  z.infer<typeof createVehicleParams>,
  unknown,
  AiToolContext
> = {
  name: "create_vehicle",
  description:
    "Create a new vehicle record. Requires either a VIN, or at least year, make, and model. " +
    "If a vehicle with the same VIN already exists in this shop, that existing vehicle is " +
    "returned instead of creating a duplicate.",
  permission: "customers:write",
  parameters: createVehicleParams,
  handler: async (session, context, params) =>
    createVehicleRecord(session, { vehicles: context.vehicles, audit: context.audit }, params),
};

const createJobParams = z.object({
  customerId: z.uuid(),
  vehicleId: z.uuid(),
  complaint: z.string().trim().min(1).max(4_000),
  mileageAtCheckIn: z.number().int().min(0).max(1_000_000).optional(),
  lotNumber: optionalText(40),
  assignedTechnicianId: z.uuid().optional(),
});

const createJobTool: ToolDefinition<z.infer<typeof createJobParams>, unknown, AiToolContext> = {
  name: "create_job",
  description:
    "Open a new job (repair order) for an existing customer and vehicle, generating the next " +
    "job number for the shop. The customer, vehicle, and any assigned technician must already " +
    "exist in this shop.",
  permission: "jobs:write",
  parameters: createJobParams,
  handler: async (session, context, params) =>
    createJobRecord(
      session,
      {
        jobs: context.jobs,
        jobNumberCounters: context.jobNumberCounters,
        shops: context.shops,
        customers: context.customers,
        vehicles: context.vehicles,
        users: context.users,
        audit: context.audit,
      },
      params,
    ),
};

const updateJobParams = z
  .object({
    jobId: z.uuid(),
    status: z.enum(jobStatuses).optional(),
    /** Pass null to unassign the job; omit to leave the current assignment unchanged. */
    assignedTechnicianId: z.uuid().nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.assignedTechnicianId !== undefined, {
    message: "provide a status change, a technician assignment, or both",
    path: ["status"],
  });

const updateJobTool: ToolDefinition<z.infer<typeof updateJobParams>, unknown, AiToolContext> = {
  name: "update_job",
  description:
    "Move a job to a new status and/or (re)assign its technician. Status changes follow the " +
    "same allowed-transition rules as the app's own job board -- an invalid transition (e.g. " +
    "skipping required steps) is rejected the same way it would be for a human user.",
  permission: "jobs:write",
  parameters: updateJobParams,
  handler: async (session, context, params) => {
    let job = await getJobRecord(session, { jobs: context.jobs }, params.jobId);

    if (params.status !== undefined) {
      job = await updateJobStatus(
        session,
        { jobs: context.jobs, audit: context.audit },
        params.jobId,
        params.status,
      );
    }
    if (params.assignedTechnicianId !== undefined) {
      job = await assignTechnician(
        session,
        { jobs: context.jobs, users: context.users, audit: context.audit },
        params.jobId,
        params.assignedTechnicianId ?? undefined,
      );
    }
    return job;
  },
};

const saveDiagnosticFindingParams = z.object({
  diagnosticSessionId: z.uuid(),
  technicianNote: z.string().trim().min(1).max(4_000),
  customerFacingSummary: z.string().trim().max(2_000).optional(),
});

const saveDiagnosticFindingTool: ToolDefinition<
  z.infer<typeof saveDiagnosticFindingParams>,
  unknown,
  AiToolContext
> = {
  name: "save_diagnostic_finding",
  description:
    "Record a new diagnostic finding as Suspected on an open diagnostic session. This never " +
    "creates a Confirmed finding -- confirming a finding always requires an explicit human action.",
  permission: "diagnostics:write",
  parameters: saveDiagnosticFindingParams,
  handler: async (session, context, params) =>
    addFindingRecord(
      session,
      { sessions: context.diagnosticSessions, findings: context.findings, audit: context.audit },
      params,
    ),
};

/** Builds a fresh registry with every currently-implemented Auto Bros tool registered. */
export function createAiToolRegistry(): ToolRegistry<AiToolContext> {
  const registry = new ToolRegistry<AiToolContext>();
  registry.register(findCustomerTool);
  registry.register(findVehicleTool);
  registry.register(getServiceHistoryTool);
  registry.register(createCustomerTool);
  registry.register(createVehicleTool);
  registry.register(createJobTool);
  registry.register(updateJobTool);
  registry.register(saveDiagnosticFindingTool);
  return registry;
}
