import type { Session } from "./model";

/**
 * Provider adapters verify managed-provider sessions server-side and return only
 * identities already mapped to active internal user records.
 */
export interface AuthenticationProvider {
  getSession(request: Request): Promise<Session | null>;
}

export class AuthenticationProviderNotConfiguredError extends Error {
  constructor() {
    super("A managed authentication provider has not been configured");
    this.name = "AuthenticationProviderNotConfiguredError";
  }
}

export class UnconfiguredAuthenticationProvider implements AuthenticationProvider {
  async getSession(): Promise<Session | null> {
    throw new AuthenticationProviderNotConfiguredError();
  }
}
