import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";
import NotFound from "./not-found";

describe("user-safe application states", () => {
  it("offers recovery without displaying error internals", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorPage
        error={Object.assign(new Error("database password: private"), { digest: "ref-123" })}
        retry={retry}
      />,
    );

    expect(screen.queryByText(/private/)).not.toBeInTheDocument();
    expect(screen.getByText("Reference: ref-123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("uses a neutral not-found message that does not disclose record existence", () => {
    render(<NotFound />);
    expect(screen.getByText(/may not be available to this account/)).toBeInTheDocument();
  });
});
