"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Display labels for the job statuses in `src/jobs/model.ts`, in the order work moves. */
const statusLabels: Record<string, string> = {
  checked_in: "Checked in",
  awaiting_diagnosis: "Awaiting diagnosis",
  diagnosing: "Diagnosing",
  awaiting_estimate: "Awaiting estimate",
  awaiting_customer_approval: "Awaiting approval",
  approved: "Approved",
  waiting_on_parts: "Waiting on parts",
  parts_received: "Parts received",
  repairing: "Repairing",
  quality_control: "Quality control",
  ready_for_pickup: "Ready for pickup",
  invoiced: "Invoiced",
  paid_closed: "Paid / closed",
  on_hold: "On hold",
};

/** Jobs a shop still has to act on -- the default board, so finished work does not bury it. */
const openStatuses = new Set([
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
  "on_hold",
]);

interface JobVehicle {
  id: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  licensePlate?: string;
}

interface JobRow {
  id: string;
  jobNumber: string;
  status: string;
  complaint: string;
  checkedInAt: string;
  serviceMode: string;
  customerName?: string;
  technicianName?: string;
  vehicle?: JobVehicle;
}

interface JobsResponse {
  jobs?: JobRow[];
  error?: string;
}

function describeVehicle(vehicle?: JobVehicle): string {
  if (!vehicle) return "Vehicle not on file";
  const described = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return described || vehicle.vin || vehicle.licensePlate || "Vehicle not on file";
}

/** "Today", "Yesterday", then a plain date -- what a service writer actually reads for. */
function describeCheckIn(value: string): string {
  const checkedIn = new Date(value);
  if (Number.isNaN(checkedIn.getTime())) return "";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday.getTime() - checkedIn.getTime()) / 86_400_000);

  const time = checkedIn.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (days < 0) return `Today ${time}`;
  if (days === 0) return `Yesterday ${time}`;
  return checkedIn.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/jobs", { signal: controller.signal });
        const result = (await response.json()) as JobsResponse;
        if (!response.ok) {
          setError(result.error ?? "Unable to load the job board.");
          return;
        }
        setJobs(result.jobs ?? []);
      } catch (cause) {
        if ((cause as Error).name !== "AbortError") {
          setError("Unable to reach Auto Bros OS. Try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const visibleJobs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (!showClosed && !openStatuses.has(job.status)) return false;
      if (!needle) return true;
      return [
        job.jobNumber,
        job.customerName,
        job.complaint,
        job.technicianName,
        describeVehicle(job.vehicle),
        job.vehicle?.vin,
        job.vehicle?.licensePlate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [jobs, query, showClosed]);

  const openCount = useMemo(
    () => jobs.filter((job) => openStatuses.has(job.status)).length,
    [jobs],
  );

  return (
    <main className="app-shell">
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
        <Link className="sign-in-link" href="/check-in">
          New check-in
        </Link>
      </header>

      <section className="workspace">
        <div className="eyebrow">Job board</div>
        <h1>What is in the shop.</h1>
        <p className="intro">
          Every job on record, newest check-in first. Search by job number, customer, vehicle,
          plate, or complaint.
        </p>

        <div className="jobs-controls">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs…"
            aria-label="Search jobs"
          />
          <label className="jobs-toggle">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(event) => setShowClosed(event.target.checked)}
            />
            Show closed
          </label>
        </div>

        {loading ? <p className="checkin-hint">Loading the job board…</p> : null}
        {error ? (
          <p className="checkin-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && jobs.length === 0 ? (
          <section className="foundation-note">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <h2>No jobs yet</h2>
              <p>
                Nothing has been checked in. <Link href="/check-in">Check in a vehicle</Link> and it
                will appear here with a permanent job number.
              </p>
            </div>
          </section>
        ) : null}

        {!loading && !error && jobs.length > 0 ? (
          <>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Today at a glance</span>
                <h2>
                  {openCount} open {openCount === 1 ? "job" : "jobs"}
                </h2>
              </div>
              <span className="data-state">{jobs.length} on record</span>
            </div>

            {visibleJobs.length === 0 ? (
              <p className="checkin-hint">No jobs match that search.</p>
            ) : (
              <ul className="jobs-list" aria-label="Jobs">
                {visibleJobs.map((job) => (
                  <li className="jobs-card" key={job.id}>
                    <div className="jobs-card-head">
                      <span className="jobs-number">{job.jobNumber}</span>
                      <span className="jobs-status" data-status={job.status}>
                        {statusLabels[job.status] ?? job.status}
                      </span>
                    </div>
                    <p className="jobs-vehicle">{describeVehicle(job.vehicle)}</p>
                    <p className="jobs-detail">{job.customerName ?? "No customer on file"}</p>
                    <p className="jobs-complaint">{job.complaint}</p>
                    <p className="jobs-detail">
                      {describeCheckIn(job.checkedInAt)}
                      {job.technicianName ? ` · ${job.technicianName}` : " · Unassigned"}
                      {job.serviceMode === "mobile" ? " · Mobile" : ""}
                      {job.serviceMode === "dealer_site" ? " · At dealership" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
