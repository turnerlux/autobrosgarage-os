import { randomUUID } from "node:crypto";

import { z } from "zod";

export const diagnosticSessionStatuses = ["open", "closed"] as const;
export type DiagnosticSessionStatus = (typeof diagnosticSessionStatuses)[number];

const sessionInputSchema = z.object({
  shopId: z.uuid(),
  jobId: z.uuid(),
  openedBy: z.uuid().optional(),
});

export type DiagnosticSessionInput = z.input<typeof sessionInputSchema>;

export interface DiagnosticSession {
  id: string;
  shopId: string;
  jobId: string;
  status: DiagnosticSessionStatus;
  openedBy?: string;
  openedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Opens a new diagnostic session on a Job. Jobs may accumulate more than one over time. */
export function openDiagnosticSession(input: DiagnosticSessionInput): DiagnosticSession {
  const parsed = sessionInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    status: "open" as const,
    openedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export class DiagnosticSessionClosedError extends Error {
  constructor() {
    super("This diagnostic session is closed and cannot be changed");
    this.name = "DiagnosticSessionClosedError";
  }
}

export function closeDiagnosticSession(session: DiagnosticSession): DiagnosticSession {
  if (session.status === "closed") throw new DiagnosticSessionClosedError();
  const now = new Date();
  return Object.freeze({ ...session, status: "closed" as const, closedAt: now, updatedAt: now });
}

export function reopenDiagnosticSession(session: DiagnosticSession): DiagnosticSession {
  if (session.status === "open") return session;
  return Object.freeze({
    ...session,
    status: "open" as const,
    closedAt: undefined,
    updatedAt: new Date(),
  });
}

/**
 * `confirmed` is deliberately excluded from the statuses a finding can be *created* or
 * generally *updated* into — see `confirmFinding`, the only path that can set it, and
 * which requires an explicit confirming actor. `ruled_out` is a normal, reversible status
 * like the others: a technician may rule something back in as new evidence appears.
 */
export const findingStatuses = ["suspected", "testing", "confirmed", "ruled_out"] as const;
export type FindingStatus = (typeof findingStatuses)[number];

const settableFindingStatuses = ["suspected", "testing", "ruled_out"] as const;
type SettableFindingStatus = (typeof settableFindingStatuses)[number];

const findingInputSchema = z.object({
  shopId: z.uuid(),
  diagnosticSessionId: z.uuid(),
  technicianNote: z.string().trim().min(1).max(4_000),
  customerFacingSummary: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(2_000).optional(),
  ),
  createdBy: z.uuid().optional(),
});

export type FindingInput = z.input<typeof findingInputSchema>;

export interface Finding {
  id: string;
  shopId: string;
  diagnosticSessionId: string;
  status: FindingStatus;
  /** The technician's own words, set once at creation. Never rewritten — see model docs. */
  technicianNote: string;
  customerFacingSummary?: string;
  confirmedBy?: string;
  confirmedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Records a new suspected problem. Always starts as `"suspected"` — never confirmed on creation. */
export function createFinding(input: FindingInput): Finding {
  const parsed = findingInputSchema.parse(input);
  const now = new Date();

  return Object.freeze({
    id: randomUUID(),
    ...parsed,
    status: "suspected" as const,
    createdAt: now,
    updatedAt: now,
  });
}

export class InvalidFindingStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFindingStatusError";
  }
}

/**
 * Moves a finding between the non-confirmed statuses. Confirming a failure is never a
 * plain status update — it always goes through `confirmFinding` below, which requires an
 * explicit confirming actor and records who/when. A confirmed finding can still be ruled
 * out later (e.g. a misdiagnosis found during repair), but only back through this path,
 * never re-confirmed implicitly by this function.
 */
export function updateFindingStatus(finding: Finding, status: SettableFindingStatus): Finding {
  if (!settableFindingStatuses.includes(status)) {
    throw new InvalidFindingStatusError(`"${status}" is not a directly settable status`);
  }
  if (finding.status === status) return finding;

  return Object.freeze({ ...finding, status, updatedAt: new Date() });
}

/** The only way a finding's status may become `"confirmed"`. Requires a confirming actor. */
export function confirmFinding(finding: Finding, confirmedBy: string): Finding {
  const parsedActor = z.uuid().parse(confirmedBy);
  const now = new Date();

  return Object.freeze({
    ...finding,
    status: "confirmed" as const,
    confirmedBy: parsedActor,
    confirmedAt: now,
    updatedAt: now,
  });
}

export function setCustomerFacingSummary(finding: Finding, summary: string): Finding {
  const parsed = z.string().trim().min(1).max(2_000).parse(summary);
  return Object.freeze({ ...finding, customerFacingSummary: parsed, updatedAt: new Date() });
}
