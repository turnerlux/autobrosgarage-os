"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { vinPattern } from "@/vehicles/model";

type CheckInMode = "standard" | "dealer";
type ServiceMode = "shop" | "dealer_site" | "mobile";

interface CustomerOption {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isDealer: boolean;
}

interface VehicleOption {
  id: string;
  customerId?: string;
  customerName?: string;
  customer?: CustomerOption;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  licensePlate?: string;
}

interface TechnicianOption {
  id: string;
  name: string;
}

interface OptionsResponse {
  customers?: CustomerOption[];
  vehicles?: VehicleOption[];
  technicians?: TechnicianOption[];
  error?: string;
}

interface CreatedCheckIn {
  job: { id: string; jobNumber: string; status: string };
  customer: { id: string; name: string };
  vehicle: { id: string; vin?: string; year?: number; make?: string; model?: string };
}

interface CheckInErrorResponse {
  error?: string;
  kind?: string;
  candidates?: CustomerOption[];
}

function formatPhone(value?: string): string {
  if (!value) return "No phone saved";
  const clean = value.replace(/\D/g, "");
  if (clean.length !== 10) return value;
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/** "2019 Toyota Tacoma", falling back to whatever identifying detail the record does have. */
function describeVehicle(vehicle: VehicleOption): string {
  const described = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  if (described) return described;
  return vehicle.vin ?? vehicle.licensePlate ?? "Saved vehicle";
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function CheckInPage() {
  const [mode, setMode] = useState<CheckInMode>("standard");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [mileage, setMileage] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [complaint, setComplaint] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("shop");
  const [serviceLocation, setServiceLocation] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [customerMatches, setCustomerMatches] = useState<CustomerOption[]>([]);
  const [vehicleMatches, setVehicleMatches] = useState<VehicleOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedCheckIn | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<CustomerOption[]>([]);
  const [savedVehicles, setSavedVehicles] = useState<VehicleOption[]>([]);
  const [loadingSavedVehicles, setLoadingSavedVehicles] = useState(false);
  const [selectedSavedVehicleId, setSelectedSavedVehicleId] = useState("");

  const vinValue = vin.trim().toUpperCase();
  const vinError =
    vinValue.length > 0 && !vinPattern.test(vinValue)
      ? "Must be 17 characters (VINs never use I, O, or Q)."
      : null;
  const lookupQuery = vinValue.length >= 6 ? vinValue : customerQuery.trim();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      async () => {
        setLoadingOptions(true);
        try {
          const response = await fetch(
            `/api/check-in/options?q=${encodeURIComponent(lookupQuery)}`,
            {
              signal: controller.signal,
            },
          );
          const result = (await response.json()) as OptionsResponse;
          if (!response.ok) {
            setError(result.error ?? "Unable to load shop records.");
            return;
          }
          setTechnicians(result.technicians ?? []);
          setCustomerMatches(result.customers ?? []);
          setVehicleMatches(result.vehicles ?? []);
        } catch (cause) {
          if ((cause as Error).name !== "AbortError") {
            setError("Unable to reach Auto Bros OS. Try again.");
          }
        } finally {
          if (!controller.signal.aborted) setLoadingOptions(false);
        }
      },
      lookupQuery ? 220 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [lookupQuery]);

  /**
   * Once a returning customer is chosen, load the vehicles already on file for them. This is
   * the half of the repeat-visit flow the customer search does not cover: the person is found
   * by name, but their truck still had to be re-typed from the VIN up.
   */
  useEffect(() => {
    // Clearing is handled where the customer is cleared, so this effect never sets state
    // synchronously -- it only subscribes to a fetch and reports what came back.
    if (!selectedCustomer) return;

    const controller = new AbortController();

    void (async () => {
      setLoadingSavedVehicles(true);
      try {
        const response = await fetch(
          `/api/check-in/customer-vehicles?customerId=${encodeURIComponent(selectedCustomer.id)}`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as OptionsResponse;
        setSavedVehicles(response.ok ? (result.vehicles ?? []) : []);
      } catch (cause) {
        // A failed lookup only costs the shortcut -- manual vehicle entry still works.
        if ((cause as Error).name !== "AbortError") setSavedVehicles([]);
      } finally {
        if (!controller.signal.aborted) setLoadingSavedVehicles(false);
      }
    })();

    return () => controller.abort();
  }, [selectedCustomer]);

  const visibleCustomers = useMemo(
    () =>
      customerMatches.filter(
        (customer) => !selectedCustomer && (mode === "standard" || customer.isDealer),
      ),
    [customerMatches, mode, selectedCustomer],
  );
  const exactVehicle = useMemo(
    () => vehicleMatches.find((vehicle) => vehicle.vin === vinValue),
    [vehicleMatches, vinValue],
  );

  function selectCustomer(customer: CustomerOption) {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setCustomerPhone(customer.phone ?? "");
    setCustomerEmail(customer.email ?? "");
    setCustomerAddress(customer.address ?? "");
    setConfirmDuplicate(false);
    setDuplicateCandidates([]);
    if (mode === "dealer") {
      setServiceMode("dealer_site");
      setServiceLocation(customer.name);
    }
    setError("");
  }

  /** Fills the vehicle fields from a vehicle already on file, so a repeat visit types nothing. */
  function selectSavedVehicle(vehicle: VehicleOption) {
    setSelectedSavedVehicleId(vehicle.id);
    setVin(vehicle.vin ?? "");
    setYear(vehicle.year ? String(vehicle.year) : "");
    setMake(vehicle.make ?? "");
    setVehicleModel(vehicle.model ?? "");
    setLicensePlate(vehicle.licensePlate ?? "");
    // Mileage is deliberately left blank: it is the one field that is different every visit.
    setMileage("");
    setError("");
  }

  function clearSavedVehicle() {
    setSelectedSavedVehicleId("");
    setVin("");
    setYear("");
    setMake("");
    setVehicleModel("");
    setLicensePlate("");
    setMileage("");
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setSavedVehicles([]);
    setSelectedSavedVehicleId("");
    setCustomerQuery("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setConfirmDuplicate(false);
    setDuplicateCandidates([]);
  }

  function changeMode(next: CheckInMode) {
    setMode(next);
    clearCustomer();
    setServiceMode(next === "dealer" ? "dealer_site" : "shop");
    setServiceLocation("");
  }

  function resetVehicleForNext() {
    setSelectedSavedVehicleId("");
    setVin("");
    setYear("");
    setMake("");
    setVehicleModel("");
    setMileage("");
    setLicensePlate("");
    setComplaint("");
    setLotNumber("");
    setTechnicianId("");
    setCreated(null);
    setError("");
    setConfirmDuplicate(false);
    setDuplicateCandidates([]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          existingCustomerId: selectedCustomer?.id,
          customer: selectedCustomer
            ? undefined
            : {
                displayName: customerQuery,
                phone: customerPhone,
                email: mode === "standard" ? customerEmail : undefined,
                address: customerAddress,
                isDealer: mode === "dealer",
                confirmDuplicate,
              },
          vehicle: {
            vin: vinValue,
            year: optionalNumber(year),
            make,
            model: vehicleModel,
            mileage: optionalNumber(mileage),
            licensePlate,
          },
          job: {
            complaint,
            lotNumber,
            serviceMode,
            serviceLocation,
            assignedTechnicianId: technicianId || undefined,
          },
        }),
      });
      const result = (await response.json()) as CreatedCheckIn & CheckInErrorResponse;
      if (!response.ok) {
        setError(result.error ?? "Unable to save this check-in.");
        if (result.kind === "customer_duplicate") {
          setDuplicateCandidates(result.candidates ?? []);
        }
        return;
      }
      setCreated(result);
    } catch {
      setError("Unable to reach Auto Bros OS. Nothing was saved—try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    const vehicleSummary =
      [created.vehicle.year, created.vehicle.make, created.vehicle.model]
        .filter(Boolean)
        .join(" ") ||
      created.vehicle.vin ||
      "Vehicle";
    return (
      <main className="app-shell checkin-shell">
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
          <span className="environment-badge live">Saved</span>
        </header>
        <section className="workspace checkin-workspace">
          <section className="checkin-success" role="status">
            <div className="eyebrow">Check-in complete</div>
            <h1>{created.job.jobNumber}</h1>
            <p>
              <strong>{created.customer.name}</strong> · {vehicleSummary}
            </p>
            <p>The customer, vehicle, and job are saved together in Auto Bros OS.</p>
            <div className="checkin-success-actions">
              <button className="quote-button" type="button" onClick={resetVehicleForNext}>
                {mode === "dealer"
                  ? `Check in another for ${created.customer.name}`
                  : "Start another check-in"}
              </button>
              <Link className="ghost-button link-button" href="/">
                Back to dashboard
              </Link>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell checkin-shell">
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
        <span className="environment-badge live">Live records</span>
      </header>

      <form className="workspace checkin-workspace" onSubmit={submit}>
        <div className="eyebrow">Fast check-in</div>
        <h1>Get a vehicle checked in fast.</h1>
        <p className="intro">
          Pick a saved customer or enter a new one, identify the vehicle, and record the diagnostic
          or complaint.
        </p>

        <fieldset className="mode-toggle">
          <legend>Check-in type</legend>
          {(["standard", "dealer"] as const).map((option) => (
            <label key={option} className={`mode-option${mode === option ? " selected" : ""}`}>
              <input
                type="radio"
                name="check-in-mode"
                value={option}
                checked={mode === option}
                onChange={() => changeMode(option)}
              />
              {option === "standard" ? "Customer" : "Dealer / fleet"}
            </label>
          ))}
        </fieldset>

        <section className="checkin-section" aria-labelledby="customer-heading">
          <div className="checkin-section-head">
            <h2 id="customer-heading">{mode === "dealer" ? "Dealer account" : "Customer"}</h2>
            {selectedCustomer ? (
              <button type="button" className="ghost-button" onClick={clearCustomer}>
                Change
              </button>
            ) : null}
          </div>
          {selectedCustomer ? (
            <div className="checkin-selected-customer">
              <p className="checkin-selected-name">{selectedCustomer.name}</p>
              <p className="checkin-selected-detail">
                {formatPhone(selectedCustomer.phone)}
                {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}
              </p>
              {selectedCustomer.address ? (
                <p className="checkin-selected-detail">{selectedCustomer.address}</p>
              ) : null}
            </div>
          ) : (
            <>
              <label htmlFor="customer-search">
                {mode === "dealer"
                  ? "Search or enter dealer name"
                  : "Search or enter customer name"}
              </label>
              <input
                id="customer-search"
                type="text"
                value={customerQuery}
                onChange={(event) => {
                  setCustomerQuery(event.target.value);
                  setConfirmDuplicate(false);
                  setDuplicateCandidates([]);
                }}
                placeholder={mode === "dealer" ? "Port City" : "Name or phone number"}
                autoComplete="off"
                required
              />
              {loadingOptions && customerQuery ? (
                <p className="checkin-hint">Searching saved customers…</p>
              ) : null}
              {visibleCustomers.length > 0 ? (
                <ul className="checkin-suggestions" aria-label="Matching customers">
                  {visibleCustomers.map((customer) => (
                    <li key={customer.id}>
                      <button type="button" onClick={() => selectCustomer(customer)}>
                        <span>{customer.name}</span>
                        <span className="checkin-suggestion-detail">
                          {formatPhone(customer.phone)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {customerQuery.trim() && !loadingOptions && visibleCustomers.length === 0 ? (
                <p className="checkin-hint">
                  No saved match—this will create a new{" "}
                  {mode === "dealer" ? "dealer account" : "customer"}.
                </p>
              ) : null}
              <div className="checkin-grid">
                <div>
                  <label htmlFor="customer-phone">Phone</label>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="(225) 555-0100"
                  />
                </div>
                {mode === "standard" ? (
                  <div>
                    <label htmlFor="customer-email">Email (optional)</label>
                    <input
                      id="customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                ) : null}
                <div>
                  <label htmlFor="customer-address">Address (optional)</label>
                  <input
                    id="customer-address"
                    type="text"
                    value={customerAddress}
                    onChange={(event) => setCustomerAddress(event.target.value)}
                    placeholder="Street, city, state, ZIP"
                  />
                </div>
              </div>
            </>
          )}
        </section>

        {exactVehicle?.customer && exactVehicle.customer.id !== selectedCustomer?.id ? (
          <div className="checkin-duplicate" role="alert">
            <div>
              <h2>VIN already on file</h2>
              <p>
                This vehicle is saved under <strong>{exactVehicle.customer.name}</strong>. Use that
                record to keep its service history together.
              </p>
            </div>
            <div className="checkin-duplicate-actions">
              <button type="button" onClick={() => selectCustomer(exactVehicle.customer!)}>
                Use {exactVehicle.customer.name}
              </button>
            </div>
          </div>
        ) : null}

        <section className="checkin-section" aria-labelledby="vehicle-heading">
          <div className="checkin-section-head">
            <h2 id="vehicle-heading">Vehicle</h2>
            {selectedSavedVehicleId ? (
              <button type="button" className="ghost-button" onClick={clearSavedVehicle}>
                Different vehicle
              </button>
            ) : null}
          </div>

          {selectedCustomer && loadingSavedVehicles ? (
            <p className="checkin-hint">Looking up vehicles on file…</p>
          ) : null}

          {selectedCustomer && !loadingSavedVehicles && savedVehicles.length > 0 ? (
            <div className="checkin-saved-vehicles">
              <p className="checkin-hint">
                {savedVehicles.length === 1
                  ? "1 vehicle on file for this customer. Tap to reuse it."
                  : `${savedVehicles.length} vehicles on file for this customer. Tap to reuse one.`}
              </p>
              <ul className="checkin-suggestions" aria-label="Vehicles on file for this customer">
                {savedVehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <button
                      type="button"
                      onClick={() => selectSavedVehicle(vehicle)}
                      aria-pressed={selectedSavedVehicleId === vehicle.id}
                    >
                      <span>{describeVehicle(vehicle)}</span>
                      <span className="checkin-suggestion-detail">
                        {vehicle.licensePlate
                          ? `Plate ${vehicle.licensePlate}`
                          : vehicle.vin
                            ? `VIN …${vehicle.vin.slice(-6)}`
                            : "No VIN on file"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {selectedCustomer && !loadingSavedVehicles && savedVehicles.length === 0 ? (
            <p className="checkin-hint">
              No vehicles on file for this customer yet—this will be their first.
            </p>
          ) : null}

          <div className="checkin-vin-row">
            <div className="checkin-vin-field">
              <label htmlFor="vin">VIN</label>
              <input
                id="vin"
                type="text"
                value={vin}
                maxLength={17}
                onChange={(event) => setVin(event.target.value.toUpperCase())}
                placeholder="17-character VIN"
                aria-invalid={vinError ? "true" : "false"}
                aria-describedby={vinError ? "vin-error" : undefined}
              />
              {vinError ? (
                <p id="vin-error" className="field-error">
                  {vinError}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="ghost-button"
              disabled
              title="Camera VIN capture is coming next"
              aria-label="Scan VIN with camera"
            >
              Scan VIN
            </button>
          </div>
          <div className="checkin-grid">
            <div>
              <label htmlFor="year">Year</label>
              <input
                id="year"
                type="text"
                inputMode="numeric"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="2021"
              />
            </div>
            <div>
              <label htmlFor="make">Make</label>
              <input
                id="make"
                type="text"
                value={make}
                onChange={(event) => setMake(event.target.value)}
                placeholder="Ford"
              />
            </div>
            <div>
              <label htmlFor="model">Model</label>
              <input
                id="model"
                type="text"
                value={vehicleModel}
                onChange={(event) => setVehicleModel(event.target.value)}
                placeholder="F-150"
              />
            </div>
            <div>
              <label htmlFor="mileage">Mileage</label>
              <input
                id="mileage"
                type="text"
                inputMode="numeric"
                value={mileage}
                onChange={(event) => setMileage(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="license-plate">License plate</label>
              <input
                id="license-plate"
                type="text"
                value={licensePlate}
                onChange={(event) => setLicensePlate(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </section>

        <section className="checkin-section" aria-labelledby="location-heading">
          <h2 id="location-heading">Where is the work?</h2>
          <fieldset className="mode-toggle compact-toggle">
            <legend>Work location</legend>
            {(["shop", "dealer_site", "mobile"] as const).map((option) => (
              <label
                key={option}
                className={`mode-option${serviceMode === option ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  name="service-mode"
                  value={option}
                  checked={serviceMode === option}
                  onChange={() => setServiceMode(option)}
                />
                {option === "shop"
                  ? "At our shop"
                  : option === "dealer_site"
                    ? "At dealership"
                    : "Mobile job"}
              </label>
            ))}
          </fieldset>
          {serviceMode !== "shop" ? (
            <div>
              <label htmlFor="service-location">
                {serviceMode === "mobile" ? "Mobile service address" : "Dealership / location"}
              </label>
              <input
                id="service-location"
                type="text"
                value={serviceLocation}
                onChange={(event) => setServiceLocation(event.target.value)}
                placeholder={serviceMode === "mobile" ? "Customer address" : "Port City Auto Sales"}
                required
              />
            </div>
          ) : null}
          {mode === "dealer" ? (
            <div>
              <label htmlFor="lot-number">Lot / PO / RO number (optional)</label>
              <input
                id="lot-number"
                type="text"
                value={lotNumber}
                onChange={(event) => setLotNumber(event.target.value)}
                placeholder="Lot 141"
              />
            </div>
          ) : null}
        </section>

        <section className="checkin-section" aria-labelledby="complaint-heading">
          <h2 id="complaint-heading">Diagnostic / complaint</h2>
          <label htmlFor="complaint">What needs to be checked or repaired?</label>
          <textarea
            id="complaint"
            rows={4}
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            placeholder="Customer states…, needs diagnosis…, or requested work…"
            required
          />
        </section>

        <section className="checkin-section" aria-labelledby="assignment-heading">
          <h2 id="assignment-heading">Assignment (optional)</h2>
          <label htmlFor="technician">Assign technician</label>
          <select
            id="technician"
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </section>

        {duplicateCandidates.length > 0 ? (
          <div className="checkin-duplicate" role="alert">
            <div>
              <h2>Possible customer duplicate</h2>
              <p>
                {duplicateCandidates.map((candidate) => candidate.name).join(", ")} already looks
                similar. Select the saved match above when it is the same customer.
              </p>
            </div>
            <div className="checkin-duplicate-actions">
              <button
                type="button"
                onClick={() => {
                  setConfirmDuplicate(true);
                  setDuplicateCandidates([]);
                  setError("");
                }}
              >
                Create a separate customer anyway
              </button>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="checkin-form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="checkin-submit-row">
          <button type="submit" className="quote-button" disabled={submitting || Boolean(vinError)}>
            {submitting ? "Saving check-in…" : "Save & start job"}
          </button>
        </div>
      </form>
    </main>
  );
}
