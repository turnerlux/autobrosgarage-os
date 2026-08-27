import type { Permission, Role, Session } from "./model";

const rolePermissions = {
  owner: [
    "jobs:read",
    "jobs:write",
    "diagnostics:read",
    "diagnostics:write",
    "customers:read",
    "customers:write",
    "estimates:read",
    "estimates:write",
    "money:read",
    "money:write",
    "users:manage",
    "settings:manage",
  ],
  manager: [
    "jobs:read",
    "jobs:write",
    "diagnostics:read",
    "diagnostics:write",
    "customers:read",
    "customers:write",
    "estimates:read",
    "estimates:write",
    "money:read",
  ],
  service_advisor: [
    "jobs:read",
    "jobs:write",
    "diagnostics:read",
    "customers:read",
    "customers:write",
    "estimates:read",
    "estimates:write",
  ],
  technician: ["jobs:read", "diagnostics:read", "diagnostics:write"],
  bookkeeper: ["customers:read", "estimates:read", "money:read", "money:write"],
} as const satisfies Record<Role, readonly Permission[]>;

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "AuthenticationRequiredError";
  }
}

export class PermissionDeniedError extends Error {
  constructor() {
    super("You do not have permission to perform this action");
    this.name = "PermissionDeniedError";
  }
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return (rolePermissions[role] as readonly Permission[]).includes(permission);
}

export function requirePermission(
  session: Session | null | undefined,
  permission: Permission,
): Session {
  if (!session) throw new AuthenticationRequiredError();
  if (!session.user.active || !hasPermission(session.user.role, permission)) {
    throw new PermissionDeniedError();
  }

  return session;
}
