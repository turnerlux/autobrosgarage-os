import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  diagnosticAttachments,
  diagnosticFindings,
  diagnosticSessions,
  diagnosticTests,
  diagnosticTroubleCodes,
} from "../db/schema";

import type { DiagnosticAttachment } from "./attachment";
import type { DtcRecord } from "./dtc";
import type { Finding } from "./model";
import type { DiagnosticSession } from "./model";
import type { TestPerformed } from "./test";

export interface DiagnosticSessionStore {
  insert(session: DiagnosticSession): Promise<void>;
  findById(shopId: string, id: string): Promise<DiagnosticSession | null>;
  update(shopId: string, id: string, session: DiagnosticSession): Promise<void>;
  listByJob(shopId: string, jobId: string): Promise<DiagnosticSession[]>;
}

export interface FindingStore {
  insert(finding: Finding): Promise<void>;
  findById(shopId: string, id: string): Promise<Finding | null>;
  update(shopId: string, id: string, finding: Finding): Promise<void>;
  listBySession(shopId: string, diagnosticSessionId: string): Promise<Finding[]>;
}

export interface DtcStore {
  insert(dtc: DtcRecord): Promise<void>;
  findById(shopId: string, id: string): Promise<DtcRecord | null>;
  update(shopId: string, id: string, dtc: DtcRecord): Promise<void>;
  listBySession(shopId: string, diagnosticSessionId: string): Promise<DtcRecord[]>;
}

export interface TestPerformedStore {
  insert(test: TestPerformed): Promise<void>;
  findById(shopId: string, id: string): Promise<TestPerformed | null>;
  listByFinding(shopId: string, findingId: string): Promise<TestPerformed[]>;
}

export interface DiagnosticAttachmentStore {
  insert(attachment: DiagnosticAttachment): Promise<void>;
  findById(shopId: string, id: string): Promise<DiagnosticAttachment | null>;
  listBySession(shopId: string, diagnosticSessionId: string): Promise<DiagnosticAttachment[]>;
}

export class InMemoryDiagnosticSessionStore implements DiagnosticSessionStore {
  private readonly sessionsById = new Map<string, DiagnosticSession>();

  async insert(session: DiagnosticSession): Promise<void> {
    this.sessionsById.set(session.id, structuredClone(session));
  }

  async findById(shopId: string, id: string): Promise<DiagnosticSession | null> {
    const session = this.sessionsById.get(id);
    return session && session.shopId === shopId ? structuredClone(session) : null;
  }

  async update(shopId: string, id: string, session: DiagnosticSession): Promise<void> {
    const existing = this.sessionsById.get(id);
    if (!existing || existing.shopId !== shopId) return;
    this.sessionsById.set(id, structuredClone(session));
  }

  async listByJob(shopId: string, jobId: string): Promise<DiagnosticSession[]> {
    return [...this.sessionsById.values()]
      .filter((session) => session.shopId === shopId && session.jobId === jobId)
      .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  }
}

export class DatabaseDiagnosticSessionStore implements DiagnosticSessionStore {
  constructor(private readonly database: Database) {}

  async insert(session: DiagnosticSession): Promise<void> {
    await this.database.insert(diagnosticSessions).values(session);
  }

  async findById(shopId: string, id: string): Promise<DiagnosticSession | null> {
    const [row] = await this.database
      .select()
      .from(diagnosticSessions)
      .where(and(eq(diagnosticSessions.shopId, shopId), eq(diagnosticSessions.id, id)))
      .limit(1);
    return (row as DiagnosticSession | undefined) ?? null;
  }

  async update(shopId: string, id: string, session: DiagnosticSession): Promise<void> {
    await this.database
      .update(diagnosticSessions)
      .set(session)
      .where(and(eq(diagnosticSessions.shopId, shopId), eq(diagnosticSessions.id, id)));
  }

  async listByJob(shopId: string, jobId: string): Promise<DiagnosticSession[]> {
    const rows = await this.database
      .select()
      .from(diagnosticSessions)
      .where(and(eq(diagnosticSessions.shopId, shopId), eq(diagnosticSessions.jobId, jobId)))
      .orderBy(asc(diagnosticSessions.openedAt));
    return rows as DiagnosticSession[];
  }
}

export class InMemoryFindingStore implements FindingStore {
  private readonly findingsById = new Map<string, Finding>();

  async insert(finding: Finding): Promise<void> {
    this.findingsById.set(finding.id, structuredClone(finding));
  }

  async findById(shopId: string, id: string): Promise<Finding | null> {
    const finding = this.findingsById.get(id);
    return finding && finding.shopId === shopId ? structuredClone(finding) : null;
  }

  async update(shopId: string, id: string, finding: Finding): Promise<void> {
    const existing = this.findingsById.get(id);
    if (!existing || existing.shopId !== shopId) return;
    this.findingsById.set(id, structuredClone(finding));
  }

  async listBySession(shopId: string, diagnosticSessionId: string): Promise<Finding[]> {
    return [...this.findingsById.values()]
      .filter(
        (finding) =>
          finding.shopId === shopId && finding.diagnosticSessionId === diagnosticSessionId,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export class DatabaseFindingStore implements FindingStore {
  constructor(private readonly database: Database) {}

  async insert(finding: Finding): Promise<void> {
    await this.database.insert(diagnosticFindings).values(finding);
  }

  async findById(shopId: string, id: string): Promise<Finding | null> {
    const [row] = await this.database
      .select()
      .from(diagnosticFindings)
      .where(and(eq(diagnosticFindings.shopId, shopId), eq(diagnosticFindings.id, id)))
      .limit(1);
    return (row as Finding | undefined) ?? null;
  }

  async update(shopId: string, id: string, finding: Finding): Promise<void> {
    await this.database
      .update(diagnosticFindings)
      .set(finding)
      .where(and(eq(diagnosticFindings.shopId, shopId), eq(diagnosticFindings.id, id)));
  }

  async listBySession(shopId: string, diagnosticSessionId: string): Promise<Finding[]> {
    const rows = await this.database
      .select()
      .from(diagnosticFindings)
      .where(
        and(
          eq(diagnosticFindings.shopId, shopId),
          eq(diagnosticFindings.diagnosticSessionId, diagnosticSessionId),
        ),
      )
      .orderBy(asc(diagnosticFindings.createdAt));
    return rows as Finding[];
  }
}

export class InMemoryDtcStore implements DtcStore {
  private readonly dtcsById = new Map<string, DtcRecord>();

  async insert(dtc: DtcRecord): Promise<void> {
    this.dtcsById.set(dtc.id, structuredClone(dtc));
  }

  async findById(shopId: string, id: string): Promise<DtcRecord | null> {
    const dtc = this.dtcsById.get(id);
    return dtc && dtc.shopId === shopId ? structuredClone(dtc) : null;
  }

  async update(shopId: string, id: string, dtc: DtcRecord): Promise<void> {
    const existing = this.dtcsById.get(id);
    if (!existing || existing.shopId !== shopId) return;
    this.dtcsById.set(id, structuredClone(dtc));
  }

  async listBySession(shopId: string, diagnosticSessionId: string): Promise<DtcRecord[]> {
    return [...this.dtcsById.values()]
      .filter((dtc) => dtc.shopId === shopId && dtc.diagnosticSessionId === diagnosticSessionId)
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  }
}

export class DatabaseDtcStore implements DtcStore {
  constructor(private readonly database: Database) {}

  async insert(dtc: DtcRecord): Promise<void> {
    await this.database.insert(diagnosticTroubleCodes).values(dtc);
  }

  async findById(shopId: string, id: string): Promise<DtcRecord | null> {
    const [row] = await this.database
      .select()
      .from(diagnosticTroubleCodes)
      .where(and(eq(diagnosticTroubleCodes.shopId, shopId), eq(diagnosticTroubleCodes.id, id)))
      .limit(1);
    return (row as DtcRecord | undefined) ?? null;
  }

  async update(shopId: string, id: string, dtc: DtcRecord): Promise<void> {
    await this.database
      .update(diagnosticTroubleCodes)
      .set(dtc)
      .where(and(eq(diagnosticTroubleCodes.shopId, shopId), eq(diagnosticTroubleCodes.id, id)));
  }

  async listBySession(shopId: string, diagnosticSessionId: string): Promise<DtcRecord[]> {
    const rows = await this.database
      .select()
      .from(diagnosticTroubleCodes)
      .where(
        and(
          eq(diagnosticTroubleCodes.shopId, shopId),
          eq(diagnosticTroubleCodes.diagnosticSessionId, diagnosticSessionId),
        ),
      )
      .orderBy(asc(diagnosticTroubleCodes.recordedAt));
    return rows as DtcRecord[];
  }
}

export class InMemoryTestPerformedStore implements TestPerformedStore {
  private readonly testsById = new Map<string, TestPerformed>();

  async insert(test: TestPerformed): Promise<void> {
    this.testsById.set(test.id, structuredClone(test));
  }

  async findById(shopId: string, id: string): Promise<TestPerformed | null> {
    const test = this.testsById.get(id);
    return test && test.shopId === shopId ? structuredClone(test) : null;
  }

  async listByFinding(shopId: string, findingId: string): Promise<TestPerformed[]> {
    return [...this.testsById.values()]
      .filter((test) => test.shopId === shopId && test.findingId === findingId)
      .sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime());
  }
}

export class DatabaseTestPerformedStore implements TestPerformedStore {
  constructor(private readonly database: Database) {}

  async insert(test: TestPerformed): Promise<void> {
    await this.database.insert(diagnosticTests).values(test);
  }

  async findById(shopId: string, id: string): Promise<TestPerformed | null> {
    const [row] = await this.database
      .select()
      .from(diagnosticTests)
      .where(and(eq(diagnosticTests.shopId, shopId), eq(diagnosticTests.id, id)))
      .limit(1);
    return (row as TestPerformed | undefined) ?? null;
  }

  async listByFinding(shopId: string, findingId: string): Promise<TestPerformed[]> {
    const rows = await this.database
      .select()
      .from(diagnosticTests)
      .where(and(eq(diagnosticTests.shopId, shopId), eq(diagnosticTests.findingId, findingId)))
      .orderBy(asc(diagnosticTests.performedAt));
    return rows as TestPerformed[];
  }
}

export class InMemoryDiagnosticAttachmentStore implements DiagnosticAttachmentStore {
  private readonly attachmentsById = new Map<string, DiagnosticAttachment>();

  async insert(attachment: DiagnosticAttachment): Promise<void> {
    this.attachmentsById.set(attachment.id, structuredClone(attachment));
  }

  async findById(shopId: string, id: string): Promise<DiagnosticAttachment | null> {
    const attachment = this.attachmentsById.get(id);
    return attachment && attachment.shopId === shopId ? structuredClone(attachment) : null;
  }

  async listBySession(
    shopId: string,
    diagnosticSessionId: string,
  ): Promise<DiagnosticAttachment[]> {
    return [...this.attachmentsById.values()]
      .filter(
        (attachment) =>
          attachment.shopId === shopId && attachment.diagnosticSessionId === diagnosticSessionId,
      )
      .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  }
}

export class DatabaseDiagnosticAttachmentStore implements DiagnosticAttachmentStore {
  constructor(private readonly database: Database) {}

  async insert(attachment: DiagnosticAttachment): Promise<void> {
    await this.database.insert(diagnosticAttachments).values(attachment);
  }

  async findById(shopId: string, id: string): Promise<DiagnosticAttachment | null> {
    const [row] = await this.database
      .select()
      .from(diagnosticAttachments)
      .where(and(eq(diagnosticAttachments.shopId, shopId), eq(diagnosticAttachments.id, id)))
      .limit(1);
    return (row as DiagnosticAttachment | undefined) ?? null;
  }

  async listBySession(
    shopId: string,
    diagnosticSessionId: string,
  ): Promise<DiagnosticAttachment[]> {
    const rows = await this.database
      .select()
      .from(diagnosticAttachments)
      .where(
        and(
          eq(diagnosticAttachments.shopId, shopId),
          eq(diagnosticAttachments.diagnosticSessionId, diagnosticSessionId),
        ),
      )
      .orderBy(asc(diagnosticAttachments.uploadedAt));
    return rows as DiagnosticAttachment[];
  }
}
