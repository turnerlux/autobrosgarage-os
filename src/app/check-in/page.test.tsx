import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CheckInPage from "./page";

const emptyOptions = { customers: [], vehicles: [], technicians: [] };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response> = () =>
    jsonResponse(emptyOptions),
) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CheckInPage", () => {
  it("shows a live, saveable fast check-in instead of the old preview", async () => {
    stubFetch();
    render(<CheckInPage />);

    expect(
      screen.getByRole("heading", { name: "Get a vehicle checked in fast." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Live records")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save & start job" })).toBeEnabled();
    expect(screen.queryByText(/preview only/i)).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it("autocompletes a saved dealer from a partial Port City search", async () => {
    stubFetch((url) =>
      jsonResponse({
        ...emptyOptions,
        customers: url.includes("Port%20City")
          ? [
              {
                id: "4f6449a6-d06b-459d-afb4-606171e9eb1e",
                name: "Port City Auto Sales",
                phone: "2255552255",
                isDealer: true,
              },
            ]
          : [],
      }),
    );
    render(<CheckInPage />);

    fireEvent.click(screen.getByRole("radio", { name: "Dealer / fleet" }));
    fireEvent.change(screen.getByLabelText("Search or enter dealer name"), {
      target: { value: "Port City" },
    });

    const match = await screen.findByRole("button", { name: /port city auto sales/i });
    fireEvent.click(match);

    expect(screen.getByText("Port City Auto Sales")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Port City Auto Sales")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "At dealership" })).toBeChecked();
  });

  it("finds an existing vehicle by VIN and offers its saved customer", async () => {
    stubFetch((url) =>
      jsonResponse({
        ...emptyOptions,
        vehicles: url.includes("1FTFW1ET1EFA10234")
          ? [
              {
                id: "18cc9f6e-a312-4aa4-a5d4-4d52c2476fc6",
                vin: "1FTFW1ET1EFA10234",
                customerId: "4f6449a6-d06b-459d-afb4-606171e9eb1e",
                customer: {
                  id: "4f6449a6-d06b-459d-afb4-606171e9eb1e",
                  name: "Jordan Reyes",
                  phone: "2255551234",
                  isDealer: false,
                },
              },
            ]
          : [],
      }),
    );
    render(<CheckInPage />);

    fireEvent.change(screen.getByLabelText("VIN"), {
      target: { value: "1FTFW1ET1EFA10234" },
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("VIN already on file");
    fireEvent.click(screen.getByRole("button", { name: "Use Jordan Reyes" }));
    expect(screen.getByText("Jordan Reyes")).toBeInTheDocument();
  });

  it("validates VIN format as the user types", () => {
    stubFetch();
    render(<CheckInPage />);

    const vinInput = screen.getByLabelText("VIN");
    fireEvent.change(vinInput, { target: { value: "TOO-SHORT" } });

    expect(
      screen.getByText("Must be 17 characters (VINs never use I, O, or Q)."),
    ).toBeInTheDocument();
    expect(vinInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save & start job" })).toBeDisabled();
  });

  it("supports separate shop, dealership, and mobile work locations", () => {
    stubFetch();
    render(<CheckInPage />);

    expect(screen.getByRole("radio", { name: "At our shop" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Mobile job" }));
    expect(screen.getByLabelText("Mobile service address")).toBeRequired();
  });

  it("saves a complete intake and shows the permanent job number", async () => {
    let submitted: Record<string, unknown> | undefined;
    stubFetch(async (_url, init) => {
      if (init?.method === "POST") {
        submitted = JSON.parse(String(init.body)) as Record<string, unknown>;
        return jsonResponse(
          {
            job: {
              id: "7144c492-791a-4bb0-a322-0562f8f0150f",
              jobNumber: "AB-2026-000001",
              status: "checked_in",
            },
            customer: {
              id: "4f6449a6-d06b-459d-afb4-606171e9eb1e",
              name: "Andres Ocupatti",
            },
            vehicle: {
              id: "18cc9f6e-a312-4aa4-a5d4-4d52c2476fc6",
              vin: "1FTFW1ET1EFA10234",
              year: 2021,
              make: "Ford",
              model: "F-150",
            },
          },
          201,
        );
      }
      return jsonResponse(emptyOptions);
    });
    render(<CheckInPage />);

    fireEvent.change(screen.getByLabelText("Search or enter customer name"), {
      target: { value: "Andres Ocupatti" },
    });
    fireEvent.change(screen.getByLabelText("VIN"), {
      target: { value: "1FTFW1ET1EFA10234" },
    });
    fireEvent.change(screen.getByLabelText("What needs to be checked or repaired?"), {
      target: { value: "Vehicle will not start; diagnose starter circuit." },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save & start job" }).closest("form")!);

    expect(await screen.findByRole("heading", { name: "AB-2026-000001" })).toBeInTheDocument();
    expect(screen.getByText(/customer, vehicle, and job are saved together/i)).toBeInTheDocument();
    expect(submitted).toMatchObject({
      customer: { displayName: "Andres Ocupatti" },
      vehicle: { vin: "1FTFW1ET1EFA10234" },
      job: { complaint: "Vehicle will not start; diagnose starter circuit." },
    });
  });

  it("requires an explicit choice before creating a likely duplicate customer", async () => {
    let postedBody: { customer?: { confirmDuplicate?: boolean } } | undefined;
    stubFetch((_url, init) => {
      if (init?.method === "POST") {
        postedBody = JSON.parse(String(init.body)) as typeof postedBody;
        return jsonResponse(
          {
            error: "A similar customer already exists. Confirm before creating a new record.",
            code: "CONFLICT",
            kind: "customer_duplicate",
            candidates: [
              {
                id: "4f6449a6-d06b-459d-afb4-606171e9eb1e",
                name: "Jordan Reyes",
                isDealer: false,
              },
            ],
          },
          409,
        );
      }
      return jsonResponse(emptyOptions);
    });
    render(<CheckInPage />);

    fireEvent.change(screen.getByLabelText("Search or enter customer name"), {
      target: { value: "Jordan Reyes" },
    });
    fireEvent.change(screen.getByLabelText("VIN"), {
      target: { value: "1FTFW1ET1EFA10234" },
    });
    fireEvent.change(screen.getByLabelText("What needs to be checked or repaired?"), {
      target: { value: "Diagnose warning light." },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save & start job" }).closest("form")!);

    const confirm = await screen.findByRole("button", {
      name: "Create a separate customer anyway",
    });
    expect(postedBody?.customer?.confirmDuplicate).toBe(false);
    fireEvent.click(confirm);
    fireEvent.submit(screen.getByRole("button", { name: "Save & start job" }).closest("form")!);
    await waitFor(() => expect(postedBody?.customer?.confirmDuplicate).toBe(true));
  });
});
