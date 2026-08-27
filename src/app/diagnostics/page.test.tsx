import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DiagnosticsPage from "./page";

function openSession() {
  render(<DiagnosticsPage />);
  fireEvent.click(screen.getByRole("button", { name: /AB-1042/ }));
}

describe("DiagnosticsPage", () => {
  it("shows the diagnostic platform layout and a clear preview-only notice", () => {
    render(<DiagnosticsPage />);

    expect(
      screen.getByRole("heading", { name: "Diagnose it once. Explain it clearly." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Preview only — nothing is saved")).toBeInTheDocument();
    expect(screen.getByText("Preview — not saved")).toBeInTheDocument();
  });

  it("hides the diagnostic workflow until a job is selected", () => {
    render(<DiagnosticsPage />);

    expect(screen.queryByRole("heading", { name: "Findings" })).not.toBeInTheDocument();
  });

  it("opens a diagnostic session when a job is picked and logs it to the timeline", () => {
    openSession();

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Findings" })).toBeInTheDocument();
    expect(
      screen.getByText("Diagnostic session opened on AB-1042 — 2021 Ford F-150 — Won't start"),
    ).toBeInTheDocument();
  });

  it("closes and reopens the session, disabling finding creation while closed", () => {
    openSession();

    fireEvent.click(screen.getByRole("button", { name: "Close session" }));
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add finding" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Reopen session" }));
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add finding" })).not.toBeDisabled();
  });

  it("logs a new finding as suspected and records it on the timeline", () => {
    openSession();

    fireEvent.change(screen.getByLabelText("Log a new finding"), {
      target: { value: "No spark on cylinder 1, coil pack suspected" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add finding" }));

    expect(screen.getByText("No spark on cylinder 1, coil pack suspected")).toBeInTheDocument();
    expect(screen.getByText("Suspected")).toBeInTheDocument();
    expect(
      screen.getByText('Finding logged: "No spark on cylinder 1, coil pack suspected"'),
    ).toBeInTheDocument();
  });

  it("moves a finding through testing before it can be confirmed, recording the confirming technician", () => {
    openSession();
    fireEvent.change(screen.getByLabelText("Log a new finding"), {
      target: { value: "No spark on cylinder 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add finding" }));

    fireEvent.click(screen.getByRole("button", { name: "Mark testing" }));
    expect(screen.getByText("Testing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm finding" }));
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Confirmed by Marcus T.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm finding" })).toBeDisabled();
  });

  it("keeps the customer-facing summary separate from the technician note", () => {
    openSession();
    fireEvent.change(screen.getByLabelText("Log a new finding"), {
      target: { value: "No spark on cylinder 1, coil pack suspected" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add finding" }));

    fireEvent.change(screen.getByLabelText("Customer-facing summary"), {
      target: { value: "Ignition coil needs replacement." },
    });

    expect(screen.getByLabelText("Customer-facing summary")).toHaveValue(
      "Ignition coil needs replacement.",
    );
    expect(screen.getByText("No spark on cylinder 1, coil pack suspected")).toBeInTheDocument();
  });

  it("validates the DTC code format as the user types", () => {
    openSession();

    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "not-a-code" } });
    expect(screen.getByText("Enter a valid DTC, e.g. P0301.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record DTC" })).toBeDisabled();
  });

  it("records a DTC and links it to a finding", () => {
    openSession();
    fireEvent.change(screen.getByLabelText("Log a new finding"), {
      target: { value: "No spark on cylinder 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add finding" }));

    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "p0301" } });
    fireEvent.click(screen.getByRole("button", { name: "Record DTC" }));

    expect(screen.getByText("P0301")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Link to finding"), {
      target: {
        value: screen.getAllByRole("option", { name: /No spark/ })[0].getAttribute("value"),
      },
    });

    expect(screen.getByText("DTC linked to a finding")).toBeInTheDocument();
  });

  it("requires a finding before a test can be logged", () => {
    openSession();

    expect(screen.getByLabelText("Finding")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Log test" })).toBeDisabled();
  });

  it("logs a test performed against a finding with its result", () => {
    openSession();
    fireEvent.change(screen.getByLabelText("Log a new finding"), {
      target: { value: "No spark on cylinder 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add finding" }));

    fireEvent.change(screen.getByLabelText("Finding"), {
      target: {
        value: screen.getAllByRole("option", { name: /No spark/ })[0].getAttribute("value"),
      },
    });
    fireEvent.change(screen.getByLabelText("Test"), {
      target: { value: "Coil pack resistance test" },
    });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "fail" } });
    fireEvent.click(screen.getByRole("button", { name: "Log test" }));

    expect(screen.getByText("Coil pack resistance test")).toBeInTheDocument();
    expect(screen.getByText("Fail", { selector: ".status-badge" })).toBeInTheDocument();
  });

  it("keeps camera and scan-report attachment actions disabled", () => {
    openSession();

    expect(screen.getByRole("button", { name: "Add photo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add scan report" })).toBeDisabled();
  });
});
