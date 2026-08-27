"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { vinPattern } from "@/vehicles/model";

type CheckInMode = "standard" | "dealer";

interface MockCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleVin?: string;
  vehicleSummary?: string;
}

/**
 * Illustrative data only. This screen is a visual preview (see docs/decisions/0003 and the Phase 2
 * addendum) and does not yet call the real search/create services built in Phase 1
 * (`src/customers`, `src/vehicles`, `src/jobs`). Replace with `universalSearch` and the
 * `create*Record` services once a session can be resolved for check-in staff.
 */
const MOCK_CUSTOMERS: MockCustomer[] = [
  {
    id: "mock-1",
    name: "Jordan Reyes",
    phone: "2255551234",
    email: "jordan.reyes@example.com",
    vehicleVin: "1FTFW1ET1EFA10234",
    vehicleSummary: "2021 Ford F-150",
  },
  {
    id: "mock-2",
    name: "Priya Nair",
    phone: "2255557890",
    email: "priya.nair@example.com",
    vehicleVin: "5YJ3E1EA7KF317000",
    vehicleSummary: "2019 Tesla Model 3",
  },
  {
    id: "mock-3",
    name: "Baton Rouge Fleet Services",
    phone: "2255552255",
    vehicleSummary: "Fleet account — multiple vehicles on file",
  },
];

const MOCK_TECHNICIANS = ["Unassigned", "Marcus T.", "Dana W.", "Chris O."];

function formatPhone(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.length !== 10) return digits;
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
}

export default function CheckInPage() {
  const [mode, setMode] = useState<CheckInMode>("standard");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<MockCustomer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [complaint, setComplaint] = useState("");
  const [technician, setTechnician] = useState(MOCK_TECHNICIANS[0]);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  const matches = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query || selectedCustomer) return [];
    return MOCK_CUSTOMERS.filter(
      (customer) => customer.name.toLowerCase().includes(query) || customer.phone.includes(query),
    );
  }, [customerQuery, selectedCustomer]);

  const vinValue = vin.trim().toUpperCase();
  const vinError =
    vinValue.length > 0 && !vinPattern.test(vinValue)
      ? "Must be 17 characters (VINs never use I, O, or Q)."
      : null;

  const duplicateMatch = useMemo(() => {
    if (duplicateDismissed || vinError || vinValue.length !== 17) return null;
    const byVin = MOCK_CUSTOMERS.find((customer) => customer.vehicleVin === vinValue);
    return byVin && byVin.id !== selectedCustomer?.id ? byVin : null;
  }, [vinValue, vinError, duplicateDismissed, selectedCustomer]);

  function selectCustomer(customer: MockCustomer) {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setDuplicateDismissed(true);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setDuplicateDismissed(false);
  }

  function changeMode(next: CheckInMode) {
    setMode(next);
    clearCustomer();
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
        <span className="environment-badge">Preview — not saved</span>
      </header>

      <section className="workspace checkin-workspace">
        <div className="eyebrow">Fast check-in</div>
        <h1>Get a vehicle checked in fast.</h1>
        <p className="intro">
          Search for a returning customer, capture the vehicle, and describe what they need — built
          for the service drive, on a phone.
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
              {option === "standard" ? "Standard check-in" : "Dealer rapid check-in"}
            </label>
          ))}
        </fieldset>

        <section className="checkin-section" aria-labelledby="customer-heading">
          <div className="checkin-section-head">
            <h2 id="customer-heading">{mode === "dealer" ? "Dealer account" : "Customer"}</h2>
            {selectedCustomer ? (
              <button type="button" className="ghost-button" onClick={clearCustomer}>
                Change {mode === "dealer" ? "account" : "customer"}
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
              {selectedCustomer.vehicleSummary ? (
                <p className="checkin-selected-detail">
                  On file: {selectedCustomer.vehicleSummary}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <label htmlFor="customer-search">
                {mode === "dealer"
                  ? "Search dealer or fleet accounts"
                  : "Search returning customers by name or phone"}
              </label>
              <input
                id="customer-search"
                type="text"
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
                placeholder={
                  mode === "dealer"
                    ? "e.g. Baton Rouge Fleet Services"
                    : "e.g. Jordan Reyes or 225-555-1234"
                }
                autoComplete="off"
              />
              {matches.length > 0 ? (
                <ul className="checkin-suggestions" aria-label="Matching customers">
                  {matches.map((customer) => (
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
              {customerQuery.trim() && matches.length === 0 ? (
                <p className="checkin-hint">
                  No match — this will be a new {mode === "dealer" ? "account" : "customer"}.
                </p>
              ) : null}

              <div className="checkin-grid">
                <div>
                  <label htmlFor="customer-name">
                    {mode === "dealer" ? "Account name" : "Full name"}
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                    placeholder={
                      mode === "dealer" ? "Fleet or dealer account name" : "First and last name"
                    }
                  />
                </div>
                <div>
                  <label htmlFor="customer-phone">Phone</label>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(event) => setNewCustomerPhone(event.target.value)}
                    placeholder="(225) 555-0100"
                  />
                </div>
                {mode === "standard" ? (
                  <div>
                    <label htmlFor="customer-email">Email (optional)</label>
                    <input
                      id="customer-email"
                      type="email"
                      value={newCustomerEmail}
                      onChange={(event) => setNewCustomerEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="purchase-order">Purchase order / RO # (optional)</label>
                    <input
                      id="purchase-order"
                      type="text"
                      value={purchaseOrder}
                      onChange={(event) => setPurchaseOrder(event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {duplicateMatch ? (
          <div className="checkin-duplicate" role="alert">
            <div>
              <h2>Possible match found</h2>
              <p>
                This VIN is already on file for <strong>{duplicateMatch.name}</strong>
                {duplicateMatch.vehicleSummary ? ` (${duplicateMatch.vehicleSummary})` : ""}. Is
                this the same {mode === "dealer" ? "account" : "customer"}?
              </p>
            </div>
            <div className="checkin-duplicate-actions">
              <button type="button" onClick={() => selectCustomer(duplicateMatch)}>
                Yes, use this record
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setDuplicateDismissed(true)}
              >
                No, different {mode === "dealer" ? "account" : "customer"}
              </button>
            </div>
          </div>
        ) : null}

        <section className="checkin-section" aria-labelledby="vehicle-heading">
          <div className="checkin-section-head">
            <h2 id="vehicle-heading">Vehicle</h2>
          </div>

          <div className="checkin-vin-row">
            <div className="checkin-vin-field">
              <label htmlFor="vin">VIN</label>
              <input
                id="vin"
                type="text"
                value={vin}
                maxLength={17}
                onChange={(event) => setVin(event.target.value)}
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
              title="Camera VIN capture is not built yet"
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
                value={model}
                onChange={(event) => setModel(event.target.value)}
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

        <section className="checkin-section" aria-labelledby="complaint-heading">
          <h2 id="complaint-heading">What&apos;s going on?</h2>
          <label htmlFor="complaint">Customer complaint or requested work</label>
          <textarea
            id="complaint"
            rows={3}
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
            placeholder="e.g. Check engine light on, feels rough at idle, needs an oil change"
          />
        </section>

        <section className="checkin-section" aria-labelledby="assignment-heading">
          <h2 id="assignment-heading">Assignment (optional)</h2>
          <label htmlFor="technician">Assign technician</label>
          <select
            id="technician"
            value={technician}
            onChange={(event) => setTechnician(event.target.value)}
          >
            {MOCK_TECHNICIANS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="checkin-hint">Preview list — not yet connected to real staff records.</p>
        </section>

        <div className="checkin-submit-row">
          <button
            type="button"
            className="quote-button"
            disabled
            title="Available once sign-in is connected"
          >
            Start check-in
          </button>
        </div>

        <section className="foundation-note">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>Preview only — nothing is saved</h2>
            <p>
              This screen shows the intended fast check-in flow. Customer search results, the
              duplicate match above, and the technician list are illustrative, not real shop data.
              It will connect to the real customer, vehicle, and job records already built in Phase
              1 once a sign-in provider is chosen.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
