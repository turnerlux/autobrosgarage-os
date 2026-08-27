import type { EntityRef } from "../audit/store";
import { requireSameShop, requirePermission } from "../auth/authorization";
import type { Session } from "../auth/model";
import { createAuditEvent } from "../audit/model";
import type { AuditStore } from "../audit/store";
import type { AuditEvent } from "../audit/model";
import type { JobStore } from "../jobs/store";
import { ApplicationError } from "../lib/errors/public-error";
import type { StoredObject } from "../storage/provider";

import {
  attachDiagnosticMedia,
  type AttachmentKind,
  type DiagnosticAttachment,
} from "./attachment";
import { linkDtcToFinding, recordDtc, type DtcRecord, type DtcStatus } from "./dtc";
import {
  closeDiagnosticSession,
  confirmFinding,
  createFinding,
  type DiagnosticSession,
  type Finding,
  type FindingStatus,
  openDiagnosticSession,
  setCustomerFacingSummary,
  updateFindingStatus,
} from "./model";
import type {
  DiagnosticAttachmentStore,
  DiagnosticSessionStore,
  DtcStore,
  FindingStore,
  TestPerformedStore,
} from "./store";
import { recordTestPerformed, type TestPerformed, type TestResult } from "./test";

export interface DiagnosticStores {
  sessions: DiagnosticSessionStore;
  findings: FindingStore;
  dtcs: DtcStore;
  tests: TestPerformedStore;
  attachments: DiagnosticAttachmentStore;
  jobs: JobStore;
  audit: AuditStore;
}

async function loadOpenSession(
  session: Session,
  stores: Pick<DiagnosticStores, "sessions">,
  diagnosticSessionId: string,
): Promise<DiagnosticSession> {
  const found = await stores.sessions.findById(session.user.shopId, diagnosticSessionId);
  if (!found) throw new ApplicationError("NOT_FOUND", "Diagnostic session not found", 404);
  requireSameShop(session, found.shopId);
  return found;
}

export async function openDiagnosticSessionRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "sessions" | "jobs" | "audit">,
  jobId: string,
  requestId?: string,
): Promise<DiagnosticSession> {
  requirePermission(session, "diagnostics:write");
  const shopId = session.user.shopId;

  const job = await stores.jobs.findById(shopId, jobId);
  if (!job) throw new ApplicationError("NOT_FOUND", "Job not found", 404);
  requireSameShop(session, job.shopId);

  const diagnosticSession = openDiagnosticSession({
    shopId,
    jobId,
    openedBy: session.user.id,
  });

  await stores.sessions.insert(diagnosticSession);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_session.opened",
      entityType: "diagnostic_session",
      entityId: diagnosticSession.id,
      after: diagnosticSession,
      source: "web",
      requestId,
    }),
  );

  return diagnosticSession;
}

export async function closeDiagnosticSessionRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "sessions" | "audit">,
  diagnosticSessionId: string,
  requestId?: string,
): Promise<DiagnosticSession> {
  requirePermission(session, "diagnostics:write");

  const existing = await loadOpenSession(session, stores, diagnosticSessionId);
  const updated = closeDiagnosticSession(existing);
  await stores.sessions.update(session.user.shopId, diagnosticSessionId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_session.closed",
      entityType: "diagnostic_session",
      entityId: diagnosticSessionId,
      before: { status: existing.status },
      after: { status: updated.status },
      source: "web",
      requestId,
    }),
  );

  return updated;
}

export interface AddFindingInput {
  diagnosticSessionId: string;
  technicianNote: string;
  customerFacingSummary?: string;
}

export async function addFindingRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "sessions" | "findings" | "audit">,
  input: AddFindingInput,
  requestId?: string,
): Promise<Finding> {
  requirePermission(session, "diagnostics:write");
  const shopId = session.user.shopId;

  const diagnosticSession = await loadOpenSession(session, stores, input.diagnosticSessionId);
  if (diagnosticSession.status !== "open") {
    throw new ApplicationError(
      "CONFLICT",
      "This diagnostic session is closed. Reopen it before adding findings.",
      409,
    );
  }

  const finding = createFinding({
    shopId,
    diagnosticSessionId: diagnosticSession.id,
    technicianNote: input.technicianNote,
    customerFacingSummary: input.customerFacingSummary,
    createdBy: session.user.id,
  });

  await stores.findings.insert(finding);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_finding.created",
      entityType: "diagnostic_finding",
      entityId: finding.id,
      after: finding,
      source: "web",
      requestId,
    }),
  );

  return finding;
}

async function loadFinding(
  session: Session,
  stores: Pick<DiagnosticStores, "findings">,
  findingId: string,
): Promise<Finding> {
  const found = await stores.findings.findById(session.user.shopId, findingId);
  if (!found) throw new ApplicationError("NOT_FOUND", "Finding not found", 404);
  requireSameShop(session, found.shopId);
  return found;
}

/** Moves a finding between the non-confirmed statuses. Use `confirmFindingRecord` to confirm. */
export async function updateFindingStatusRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "findings" | "audit">,
  findingId: string,
  status: Exclude<FindingStatus, "confirmed">,
  requestId?: string,
): Promise<Finding> {
  requirePermission(session, "diagnostics:write");

  const existing = await loadFinding(session, stores, findingId);
  const updated = updateFindingStatus(existing, status);
  await stores.findings.update(session.user.shopId, findingId, updated);

  if (updated.status !== existing.status) {
    await stores.audit.append(
      createAuditEvent({
        shopId: session.user.shopId,
        actorType: "human",
        actorId: session.user.id,
        action: "diagnostic_finding.status_changed",
        entityType: "diagnostic_finding",
        entityId: findingId,
        before: { status: existing.status },
        after: { status: updated.status },
        source: "web",
        requestId,
      }),
    );
  }

  return updated;
}

/**
 * The only service path that can mark a finding confirmed. Always records the confirming
 * actor and an explicit audit event, per the owner's requirement that a confirmed failure
 * always be a deliberate, attributable action -- never an implicit side effect of another
 * update.
 */
export async function confirmFindingRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "findings" | "audit">,
  findingId: string,
  requestId?: string,
): Promise<Finding> {
  requirePermission(session, "diagnostics:write");

  const existing = await loadFinding(session, stores, findingId);
  const updated = confirmFinding(existing, session.user.id);
  await stores.findings.update(session.user.shopId, findingId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_finding.confirmed",
      entityType: "diagnostic_finding",
      entityId: findingId,
      before: { status: existing.status },
      after: { status: updated.status, confirmedBy: updated.confirmedBy },
      source: "web",
      requestId,
    }),
  );

  return updated;
}

export async function setFindingCustomerSummaryRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "findings" | "audit">,
  findingId: string,
  summary: string,
  requestId?: string,
): Promise<Finding> {
  requirePermission(session, "diagnostics:write");

  const existing = await loadFinding(session, stores, findingId);
  const updated = setCustomerFacingSummary(existing, summary);
  await stores.findings.update(session.user.shopId, findingId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId: session.user.shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_finding.customer_summary_set",
      entityType: "diagnostic_finding",
      entityId: findingId,
      before: { customerFacingSummary: existing.customerFacingSummary },
      after: { customerFacingSummary: updated.customerFacingSummary },
      source: "web",
      requestId,
    }),
  );

  return updated;
}

export interface RecordDtcInput {
  diagnosticSessionId: string;
  code: string;
  module?: string;
  status?: DtcStatus;
  description?: string;
}

export async function recordDtcRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "sessions" | "dtcs" | "audit">,
  input: RecordDtcInput,
  requestId?: string,
): Promise<DtcRecord> {
  requirePermission(session, "diagnostics:write");
  const shopId = session.user.shopId;

  const diagnosticSession = await loadOpenSession(session, stores, input.diagnosticSessionId);

  const dtc = recordDtc({
    shopId,
    diagnosticSessionId: diagnosticSession.id,
    code: input.code,
    module: input.module,
    status: input.status,
    description: input.description,
  });

  await stores.dtcs.insert(dtc);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_trouble_code.recorded",
      entityType: "diagnostic_trouble_code",
      entityId: dtc.id,
      after: dtc,
      source: "web",
      requestId,
    }),
  );

  return dtc;
}

export async function linkDtcToFindingRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "dtcs" | "findings" | "audit">,
  dtcId: string,
  findingId: string,
  requestId?: string,
): Promise<DtcRecord> {
  requirePermission(session, "diagnostics:write");
  const shopId = session.user.shopId;

  const dtc = await stores.dtcs.findById(shopId, dtcId);
  if (!dtc) throw new ApplicationError("NOT_FOUND", "DTC not found", 404);
  requireSameShop(session, dtc.shopId);

  const finding = await loadFinding(session, stores, findingId);
  requireSameShop(session, finding.shopId);

  const updated = linkDtcToFinding(dtc, finding.id);
  await stores.dtcs.update(shopId, dtcId, updated);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_trouble_code.linked",
      entityType: "diagnostic_trouble_code",
      entityId: dtcId,
      before: { findingId: dtc.findingId },
      after: { findingId: updated.findingId },
      source: "web",
      requestId,
    }),
  );

  return updated;
}

export interface RecordTestInput {
  findingId: string;
  name: string;
  measurementValue?: string;
  expectedRange?: string;
  result: TestResult;
  notes?: string;
}

export async function recordTestRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "findings" | "tests" | "audit">,
  input: RecordTestInput,
  requestId?: string,
): Promise<TestPerformed> {
  requirePermission(session, "diagnostics:write");
  const shopId = session.user.shopId;

  const finding = await loadFinding(session, stores, input.findingId);

  const test = recordTestPerformed({
    shopId,
    findingId: finding.id,
    name: input.name,
    measurementValue: input.measurementValue,
    expectedRange: input.expectedRange,
    result: input.result,
    notes: input.notes,
    performedBy: session.user.id,
  });

  await stores.tests.insert(test);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_test.recorded",
      entityType: "diagnostic_test",
      entityId: test.id,
      after: test,
      source: "web",
      requestId,
    }),
  );

  return test;
}

export interface AttachDiagnosticMediaInput {
  diagnosticSessionId: string;
  findingId?: string;
  kind: AttachmentKind;
  originalFileName: string;
}

export async function attachDiagnosticMediaRecord(
  session: Session,
  stores: Pick<DiagnosticStores, "sessions" | "attachments" | "audit">,
  input: AttachDiagnosticMediaInput,
  storedObject: Pick<StoredObject, "key" | "contentType" | "byteLength">,
  requestId?: string,
): Promise<DiagnosticAttachment> {
  requirePermission(session, "diagnostics:write");
  const shopId = session.user.shopId;

  const diagnosticSession = await loadOpenSession(session, stores, input.diagnosticSessionId);

  const attachment = attachDiagnosticMedia(
    {
      shopId,
      diagnosticSessionId: diagnosticSession.id,
      findingId: input.findingId,
      kind: input.kind,
      originalFileName: input.originalFileName,
      uploadedBy: session.user.id,
    },
    storedObject,
  );

  await stores.attachments.insert(attachment);
  await stores.audit.append(
    createAuditEvent({
      shopId,
      actorType: "human",
      actorId: session.user.id,
      action: "diagnostic_attachment.added",
      entityType: "diagnostic_attachment",
      entityId: attachment.id,
      after: { kind: attachment.kind, originalFileName: attachment.originalFileName },
      source: "web",
      requestId,
    }),
  );

  return attachment;
}

/**
 * The full audit trail for a diagnostic session and everything under it (its findings,
 * the tests performed against each finding, the DTCs read, and any attachments), oldest
 * first. Built from the general-purpose audit log rather than a bespoke timeline table --
 * see `AuditStore.listForEntities`.
 */
export async function getDiagnosticTimeline(
  session: Session,
  stores: Pick<
    DiagnosticStores,
    "sessions" | "findings" | "dtcs" | "tests" | "attachments" | "audit"
  >,
  diagnosticSessionId: string,
): Promise<AuditEvent[]> {
  requirePermission(session, "diagnostics:read");
  const shopId = session.user.shopId;

  const diagnosticSession = await loadOpenSession(session, stores, diagnosticSessionId);

  const findings = await stores.findings.listBySession(shopId, diagnosticSession.id);
  const dtcs = await stores.dtcs.listBySession(shopId, diagnosticSession.id);
  const attachments = await stores.attachments.listBySession(shopId, diagnosticSession.id);
  const testsByFinding = await Promise.all(
    findings.map((finding) => stores.tests.listByFinding(shopId, finding.id)),
  );

  const refs: EntityRef[] = [
    { entityType: "diagnostic_session", entityId: diagnosticSession.id },
    ...findings.map((finding) => ({ entityType: "diagnostic_finding", entityId: finding.id })),
    ...dtcs.map((dtc) => ({ entityType: "diagnostic_trouble_code", entityId: dtc.id })),
    ...testsByFinding.flat().map((test) => ({ entityType: "diagnostic_test", entityId: test.id })),
    ...attachments.map((attachment) => ({
      entityType: "diagnostic_attachment",
      entityId: attachment.id,
    })),
  ];

  return stores.audit.listForEntities(shopId, refs);
}
