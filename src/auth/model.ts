export const roles = ["owner", "manager", "service_advisor", "technician", "bookkeeper"] as const;

export type Role = (typeof roles)[number];

export const permissions = [
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
] as const;

export type Permission = (typeof permissions)[number];

export interface AuthenticatedUser {
  id: string;
  role: Role;
  displayName: string;
  active: boolean;
}

export interface Session {
  user: AuthenticatedUser;
  sessionId: string;
  authenticatedAt: Date;
}
