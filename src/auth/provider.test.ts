import { describe, expect, it } from "vitest";

import {
  AuthenticationProviderNotConfiguredError,
  UnconfiguredAuthenticationProvider,
} from "./provider";

describe("UnconfiguredAuthenticationProvider", () => {
  it("fails closed instead of creating a development identity", async () => {
    const provider = new UnconfiguredAuthenticationProvider();

    await expect(provider.getSession()).rejects.toThrow(AuthenticationProviderNotConfiguredError);
  });
});
