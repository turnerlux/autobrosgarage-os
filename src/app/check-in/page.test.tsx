import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CheckInPage from "./page";

describe("CheckInPage", () => {
  it("shows the fast check-in layout and a clear preview-only notice", () => {
    render(<CheckInPage />);

    expect(
      screen.getByRole("heading", { name: "Get a vehicle checked in fast." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Preview only — nothing is saved")).toBeInTheDocument();
    expect(screen.getByText("Preview — not saved")).toBeInTheDocument();
  });

  it("keeps the start check-in action unavailable until sign-in is connected", () => {
    render(<CheckInPage />);

    const submit = screen.getByRole("button", { name: "Start check-in" });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("title", "Available once sign-in is connected");

    const camera = screen.getByRole("button", { name: "Scan VIN with camera" });
    expect(camera).toBeDisabled();
  });

  it("finds a returning customer by name and fills in their details on selection", () => {
    render(<CheckInPage />);

    fireEvent.change(screen.getByLabelText(/search returning customers/i), {
      target: { value: "Jordan" },
    });
    expect(screen.getByRole("button", { name: /jordan reyes/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /jordan reyes/i }));

    expect(screen.getByText("Jordan Reyes")).toBeInTheDocument();
    expect(screen.getByText(/\(225\) 555-1234/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change customer" })).toBeInTheDocument();
  });

  it("tells the user a search with no match will start a new customer", () => {
    render(<CheckInPage />);

    fireEvent.change(screen.getByLabelText(/search returning customers/i), {
      target: { value: "Someone New" },
    });

    expect(screen.getByText("No match — this will be a new customer.")).toBeInTheDocument();
  });

  it("validates VIN format as the user types", () => {
    render(<CheckInPage />);

    const vinInput = screen.getByLabelText("VIN");
    fireEvent.change(vinInput, { target: { value: "TOO-SHORT" } });

    expect(
      screen.getByText("Must be 17 characters (VINs never use I, O, or Q)."),
    ).toBeInTheDocument();
    expect(vinInput).toHaveAttribute("aria-invalid", "true");
  });

  it("surfaces a possible duplicate when the VIN matches an existing record", () => {
    render(<CheckInPage />);

    fireEvent.change(screen.getByLabelText("VIN"), {
      target: { value: "1FTFW1ET1EFA10234" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Possible match found");
    expect(screen.getByRole("alert")).toHaveTextContent("Jordan Reyes");

    fireEvent.click(screen.getByRole("button", { name: "No, different customer" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("switches to dealer rapid check-in fields when that mode is selected", () => {
    render(<CheckInPage />);

    fireEvent.click(screen.getByRole("radio", { name: "Dealer rapid check-in" }));

    expect(screen.getByRole("heading", { name: "Dealer account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Purchase order / RO # (optional)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email (optional)")).not.toBeInTheDocument();
  });
});
