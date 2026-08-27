import { z } from "zod";

import type { AuditStore } from "../../audit/store";
import { customerTypes, pricingProfiles } from "../../customers/model";
import { createCustomerRecord } from "../../customers/service";
import type { CustomerStore } from "../../customers/store";
import { addFindingRecord } from "../../diagnostics/service";
import type { DiagnosticSessionStore, FindingStore } from "../../diagnostics/store";
import { getVehicleServiceHistory } from "../../jobs/service";
import type { JobStore } from "../../jobs/store";
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
  registry.register(saveDiagnosticFindingTool);
  return registry;
}
