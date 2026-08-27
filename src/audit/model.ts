import { randomUUID } from "node:crypto";

import { z } from "zod";

export const auditActorTypes = ["human", "agent", "system", "customer", "dealer"] as const;
export const auditSources = ["web", "api", "ai_tool", "integration", "migration"] as const;

const auditEventInputSchema = z.object({
  shopId: z.uuid(),
  actorType: z.enum(auditActorTypes),
  actorId: z.string().min(1).optional(),
  action: z.string().min(1).max(160),
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(160),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  reason: z.string().max(1_000).optional(),
  source: z.enum(auditSources),
  approvalReference: z.string().max(160).optional(),
  requestId: z.string().max(160).optional(),
});

export type AuditEventInput = z.input<typeof auditEventInputSchema>;
export type AuditEvent = z.output<typeof auditEventInputSchema> & {
  id: string;
  createdAt: Date;
};

export function createAuditEvent(input: AuditEventInput): AuditEvent {
  return Object.freeze({
    ...auditEventInputSchema.parse(input),
    id: randomUUID(),
    createdAt: new Date(),
  });
}
