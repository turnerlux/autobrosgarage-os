"use client";

import Link from "next/link";
import { useState } from "react";

import { dtcCodePattern } from "@/diagnostics/dtc";
import type { FindingStatus } from "@/diagnostics/model";
import { settableFindingStatuses } from "@/diagnostics/model";
import type { TestResult } from "@/diagnostics/test";

interface MockJob {
  id: string;
  label: string;
}

interface UiFinding {
  id: string;
  technicianNote: string;
  status: FindingStatus;
  customerFacingSummary: string;
  confirmedBy?: string;
}

interface UiDtc {
  id: string;
  code: string;
  module?: string;
  findingId?: string;
}

interface UiTest {
  id: string;
  findingId: string;
  name: string;
  result: TestResult;
}

/**
 * Illustrative data only. This screen is a visual preview (see docs/decisions/0003 and the
 * Phase 2/3 addendum) and does not yet call the real diagnostics services built in Phase 3
 * (`src/diagnostics/service.ts`). Replace with `openDiagnosticSessionRecord`,
 * `addFindingRecord`, `confirmFindingRecord`, `recordDtcRecord`, `recordTestRecord`, and
 * `getDiagnosticTimeline` once a session can be resolved for shop staff.
 */
const MOCK_OPEN_JOBS: MockJob[] = [
  { id: "mock-job-1", label: "AB-1042 — 2021 Ford F-150 — Won't start" },
  { id: "mock-job-2", label: "AB-1043 — 2019 Tesla Model 3 — Check engine light" },
  { id: "mock-job-3", label: "AB-1044 — 2017 Honda Civic — Grinding noise on braking" },
];

const statusLabels: Record<FindingStatus, string> = {
  suspected: "Suspected",
  testing: "Testing",
  confirmed: "Confirmed",
  ruled_out: "Ruled out",
};

const resultLabels: Record<TestResult, string> = {
  pass: "Pass",
  fail: "Fail",
  inconclusive: "Inconclusive",
};

const MOCK_TECHNICIAN = "Marcus T.";

function shortFindingLabel(finding: UiFinding, index: number): string {
  const note = finding.technicianNote.trim();
  const snippet = note.length > 40 ? `${note.slice(0, 40)}…` : note;
  return `Finding ${index + 1} — ${snippet}`;
}

export default function DiagnosticsPage() {
  const [selectedJob, setSelectedJob] = useState<MockJob | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"open" | "closed" | null>(null);
  const [timeline, setTimeline] = useState<string[]>([]);

  const [findings, setFindings] = useState<UiFinding[]>([]);
  const [newFindingNote, setNewFindingNote] = useState("");

  const [dtcs, setDtcs] = useState<UiDtc[]>([]);
  const [newDtcCode, setNewDtcCode] = useState("");
  const [newDtcModule, setNewDtcModule] = useState("");
  const dtcCodeValue = newDtcCode.trim().toUpperCase();
  const dtcCodeError =
    dtcCodeValue.length > 0 && !dtcCodePattern.test(dtcCodeValue)
      ? "Enter a valid DTC, e.g. P0301."
      : null;

  const [tests, setTests] = useState<UiTest[]>([]);
  const [newTestFindingId, setNewTestFindingId] = useState("");
  const [newTestName, setNewTestName] = useState("");
  const [newTestResult, setNewTestResult] = useState<TestResult>("pass");

  function logEvent(description: string) {
    setTimeline((events) => [...events, description]);
  }

  function openSession(job: MockJob) {
    setSelectedJob(job);
    setSessionStatus("open");
    setFindings([]);
    setDtcs([]);
    setTests([]);
    setTimeline([`Diagnostic session opened on ${job.label}`]);
  }

  function closeSession() {
    setSessionStatus("closed");
    logEvent("Diagnostic session closed");
  }

  function reopenSession() {
    setSessionStatus("open");
    logEvent("Diagnostic session reopened");
  }

  function addFinding(event: React.FormEvent) {
    event.preventDefault();
    const note = newFindingNote.trim();
    if (!note || sessionStatus !== "open") return;

    const finding: UiFinding = {
      id: crypto.randomUUID(),
      technicianNote: note,
      status: "suspected",
      customerFacingSummary: "",
    };
    setFindings((current) => [...current, finding]);
    setNewFindingNote("");
    logEvent(`Finding logged: "${note}"`);
  }

  function setFindingStatus(findingId: string, status: FindingStatus) {
    setFindings((current) =>
      current.map((finding) => (finding.id === findingId ? { ...finding, status } : finding)),
    );
    logEvent(`Finding status changed to ${statusLabels[status]}`);
  }

  function confirmFinding(findingId: string) {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === findingId
          ? { ...finding, status: "confirmed", confirmedBy: MOCK_TECHNICIAN }
          : finding,
      ),
    );
    logEvent(`Finding confirmed by ${MOCK_TECHNICIAN}`);
  }

  function setCustomerSummary(findingId: string, summary: string) {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === findingId ? { ...finding, customerFacingSummary: summary } : finding,
      ),
    );
  }

  function addDtc(event: React.FormEvent) {
    event.preventDefault();
    if (dtcCodeError || !dtcCodeValue || sessionStatus !== "open") return;

    const dtc: UiDtc = {
      id: crypto.randomUUID(),
      code: dtcCodeValue,
      module: newDtcModule.trim() || undefined,
    };
    setDtcs((current) => [...current, dtc]);
    setNewDtcCode("");
    setNewDtcModule("");
    logEvent(`DTC ${dtc.code} recorded`);
  }

  function linkDtc(dtcId: string, findingId: string) {
    setDtcs((current) =>
      current.map((dtc) =>
        dtc.id === dtcId ? { ...dtc, findingId: findingId || undefined } : dtc,
      ),
    );
    if (findingId) logEvent("DTC linked to a finding");
  }

  function addTest(event: React.FormEvent) {
    event.preventDefault();
    const name = newTestName.trim();
    if (!name || !newTestFindingId || sessionStatus !== "open") return;

    const test: UiTest = {
      id: crypto.randomUUID(),
      findingId: newTestFindingId,
      name,
      result: newTestResult,
    };
    setTests((current) => [...current, test]);
    setNewTestName("");
    logEvent(`Test logged: "${name}" — ${resultLabels[test.result]}`);
  }

  return (
    <main className="app-shell diagnostics-workspace">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Auto Bros OS home">
          <span className="brand-mark" aria-hidden="true">
            AB
          </span>
          <span>
            <strong>Auto Bros</strong>
            <small>Garage OS</small>
          </span>
        </Link>
        <span className="environment-badge">Preview — not saved</span>
      </header>

      <section className="workspace">
        <div className="eyebrow">Diagnostic platform</div>
        <h1>Diagnose it once. Explain it clearly.</h1>
        <p className="intro">
          Log what the vehicle is actually doing, track DTCs and tests as evidence, and keep a
          customer-facing summary separate from the technician&apos;s own notes.
        </p>

        <section className="checkin-section" aria-labelledby="session-heading">
          <div className="checkin-section-head">
            <h2 id="session-heading">Diagnostic session</h2>
            {sessionStatus ? (
              <span className={`status-badge status-badge-${sessionStatus}`}>
                {sessionStatus === "open" ? "Open" : "Closed"}
              </span>
            ) : null}
          </div>

          {!selectedJob ? (
            <>
              <p className="checkin-hint">Pick a job to open a diagnostic session on.</p>
              <ul className="checkin-suggestions" aria-label="Open jobs">
                {MOCK_OPEN_JOBS.map((job) => (
                  <li key={job.id}>
                    <button type="button" onClick={() => openSession(job)}>
                      <span>{job.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="checkin-selected-customer">
              <p className="checkin-selected-name">{selectedJob.label}</p>
              <div className="diagnostics-session-actions">
                {sessionStatus === "open" ? (
                  <button type="button" className="ghost-button" onClick={closeSession}>
                    Close session
                  </button>
                ) : (
                  <button type="button" className="ghost-button" onClick={reopenSession}>
                    Reopen session
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {selectedJob ? (
          <>
            <section className="checkin-section" aria-labelledby="findings-heading">
              <h2 id="findings-heading">Findings</h2>

              {findings.length === 0 ? (
                <p className="checkin-hint">No findings logged yet.</p>
              ) : (
                <ul className="diagnostics-finding-list">
                  {findings.map((finding) => (
                    <li key={finding.id} className="diagnostics-finding-card">
                      <div className="checkin-section-head">
                        <p className="diagnostics-finding-note">{finding.technicianNote}</p>
                        <span className={`status-badge status-badge-${finding.status}`}>
                          {statusLabels[finding.status]}
                        </span>
                      </div>

                      {finding.confirmedBy ? (
                        <p className="checkin-hint">Confirmed by {finding.confirmedBy}</p>
                      ) : null}

                      <label htmlFor={`summary-${finding.id}`}>Customer-facing summary</label>
                      <textarea
                        id={`summary-${finding.id}`}
                        rows={2}
                        value={finding.customerFacingSummary}
                        onChange={(event) => setCustomerSummary(finding.id, event.target.value)}
                        placeholder="Plain-language explanation for the customer (kept separate from the technician's note)"
                      />

                      <div className="diagnostics-finding-actions">
                        {settableFindingStatuses
                          .filter((status) => status !== finding.status)
                          .map((status) => (
                            <button
                              key={status}
                              type="button"
                              className="ghost-button"
                              onClick={() => setFindingStatus(finding.id, status)}
                            >
                              Mark {statusLabels[status].toLowerCase()}
                            </button>
                          ))}
                        <button
                          type="button"
                          className="ghost-button diagnostics-confirm-button"
                          disabled={finding.status === "confirmed"}
                          onClick={() => confirmFinding(finding.id)}
                        >
                          Confirm finding
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form className="diagnostics-inline-form" onSubmit={addFinding}>
                <label htmlFor="new-finding">Log a new finding</label>
                <textarea
                  id="new-finding"
                  rows={2}
                  value={newFindingNote}
                  onChange={(event) => setNewFindingNote(event.target.value)}
                  placeholder="e.g. No spark on cylinder 1, coil pack suspected"
                />
                <button type="submit" className="ghost-button" disabled={sessionStatus !== "open"}>
                  Add finding
                </button>
              </form>
            </section>

            <section className="checkin-section" aria-labelledby="dtc-heading">
              <h2 id="dtc-heading">Trouble codes (DTCs)</h2>

              {dtcs.length === 0 ? (
                <p className="checkin-hint">No DTCs recorded yet.</p>
              ) : (
                <ul className="diagnostics-dtc-list">
                  {dtcs.map((dtc) => (
                    <li key={dtc.id}>
                      <span className="diagnostics-dtc-code">{dtc.code}</span>
                      <span className="checkin-suggestion-detail">{dtc.module ?? "No module"}</span>
                      <label htmlFor={`link-${dtc.id}`}>Link to finding</label>
                      <select
                        id={`link-${dtc.id}`}
                        value={dtc.findingId ?? ""}
                        onChange={(event) => linkDtc(dtc.id, event.target.value)}
                        disabled={findings.length === 0}
                      >
                        <option value="">Unlinked</option>
                        {findings.map((finding, index) => (
                          <option key={finding.id} value={finding.id}>
                            {shortFindingLabel(finding, index)}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}

              <form className="diagnostics-inline-form checkin-grid" onSubmit={addDtc}>
                <div>
                  <label htmlFor="dtc-code">Code</label>
                  <input
                    id="dtc-code"
                    type="text"
                    value={newDtcCode}
                    onChange={(event) => setNewDtcCode(event.target.value)}
                    placeholder="P0301"
                    aria-invalid={dtcCodeError ? "true" : "false"}
                    aria-describedby={dtcCodeError ? "dtc-code-error" : undefined}
                  />
                  {dtcCodeError ? (
                    <p id="dtc-code-error" className="field-error">
                      {dtcCodeError}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="dtc-module">Module (optional)</label>
                  <input
                    id="dtc-module"
                    type="text"
                    value={newDtcModule}
                    onChange={(event) => setNewDtcModule(event.target.value)}
                    placeholder="PCM"
                  />
                </div>
                <button
                  type="submit"
                  className="ghost-button"
                  disabled={sessionStatus !== "open" || !dtcCodeValue || Boolean(dtcCodeError)}
                >
                  Record DTC
                </button>
              </form>
            </section>

            <section className="checkin-section" aria-labelledby="tests-heading">
              <h2 id="tests-heading">Tests performed</h2>

              {tests.length === 0 ? (
                <p className="checkin-hint">No tests logged yet.</p>
              ) : (
                <ul className="diagnostics-dtc-list">
                  {tests.map((test) => {
                    const findingIndex = findings.findIndex((f) => f.id === test.findingId);
                    return (
                      <li key={test.id}>
                        <span className="diagnostics-dtc-code">{test.name}</span>
                        <span className={`status-badge status-badge-test-${test.result}`}>
                          {resultLabels[test.result]}
                        </span>
                        <span className="checkin-suggestion-detail">
                          {findingIndex >= 0
                            ? shortFindingLabel(findings[findingIndex], findingIndex)
                            : "Finding removed"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form className="diagnostics-inline-form checkin-grid" onSubmit={addTest}>
                <div>
                  <label htmlFor="test-finding">Finding</label>
                  <select
                    id="test-finding"
                    value={newTestFindingId}
                    onChange={(event) => setNewTestFindingId(event.target.value)}
                    disabled={findings.length === 0}
                  >
                    <option value="">Select a finding</option>
                    {findings.map((finding, index) => (
                      <option key={finding.id} value={finding.id}>
                        {shortFindingLabel(finding, index)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="test-name">Test</label>
                  <input
                    id="test-name"
                    type="text"
                    value={newTestName}
                    onChange={(event) => setNewTestName(event.target.value)}
                    placeholder="Coil pack resistance test"
                  />
                </div>
                <div>
                  <label htmlFor="test-result">Result</label>
                  <select
                    id="test-result"
                    value={newTestResult}
                    onChange={(event) => setNewTestResult(event.target.value as TestResult)}
                  >
                    {(["pass", "fail", "inconclusive"] as const).map((result) => (
                      <option key={result} value={result}>
                        {resultLabels[result]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="ghost-button"
                  disabled={
                    sessionStatus !== "open" || findings.length === 0 || !newTestName.trim()
                  }
                >
                  Log test
                </button>
              </form>
            </section>

            <section className="checkin-section" aria-labelledby="attachments-heading">
              <h2 id="attachments-heading">Media</h2>
              <div className="diagnostics-session-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled
                  title="Camera capture is not built yet"
                >
                  Add photo
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled
                  title="Scan report upload is not built yet"
                >
                  Add scan report
                </button>
              </div>
            </section>

            <section className="checkin-section" aria-labelledby="timeline-heading">
              <h2 id="timeline-heading">Timeline</h2>
              {timeline.length === 0 ? (
                <p className="checkin-hint">Nothing recorded yet.</p>
              ) : (
                <ol className="diagnostics-timeline">
                  {timeline.map((entry, index) => (
                    <li key={`${index}-${entry}`}>{entry}</li>
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : null}

        <section className="foundation-note">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>Preview only — nothing is saved</h2>
            <p>
              This screen shows the intended diagnostic workflow. Jobs, findings, DTCs, and tests
              here are illustrative, not real shop data — everything resets on refresh. The real
              backend for all of this already exists (`src/diagnostics`) and will be connected once
              a sign-in provider is chosen, the same as the Phase 2 check-in screen.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
