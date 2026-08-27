import { describe, expect, it } from "vitest";

import { ApplicationError, toPublicError } from "./public-error";

describe("toPublicError", () => {
  it("preserves explicitly safe operational errors", () => {
    expect(
      toPublicError(new ApplicationError("CONFLICT", "That VIN already exists.", 409)),
    ).toMatchObject({ code: "CONFLICT", message: "That VIN already exists.", status: 409 });
  });

  it("does not expose unexpected error details", () => {
    const publicError = toPublicError(
      new Error("postgresql://user:secret@private-host/customer-record"),
      "request-123",
    );

    expect(publicError.message).not.toContain("secret");
    expect(publicError).toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
      retryable: true,
      reference: "request-123",
    });
  });
});
