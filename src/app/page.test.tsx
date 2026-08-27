import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("presents the operational shell without fabricated shop data", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Good work starts with less paperwork." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Waiting for database connection")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  it("keeps unimplemented actions unavailable", () => {
    render(<Home />);

    expect(screen.getByRole("button", { name: /create quote/i })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "What needs doing?" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("exposes the specified primary navigation", () => {
    render(<Home />);

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    for (const item of ["AI", "Jobs", "Customers", "Diagnostics", "Money", "More"]) {
      expect(navigation).toHaveTextContent(item);
    }
  });
});
