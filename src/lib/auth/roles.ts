/**
 * Role model and permission matrix.
 *
 * Permissions are declared as named capabilities rather than checked by
 * comparing role strings at call sites. Adding a role or shifting a capability
 * then means editing this one table instead of hunting through the codebase.
 */

export const ROLES = ["DEALER", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Dealer-facing
  "inventory:view:own",
  "inventory:update:own",
  "report:submit:own",
  "report:view:own",
  // Admin-facing
  "dealer:view:all",
  "dealer:create",
  "dealer:update",
  "inventory:view:all",
  "inventory:import",
  "product:manage",
  "report:view:all",
  "report:export",
  "replenishment:generate",
  // Super-admin only
  "user:manage",
  "settings:manage",
  "email_template:manage",
  "audit_log:view",
  "integration:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const DEALER_PERMISSIONS: Permission[] = [
  "inventory:view:own",
  "inventory:update:own",
  "report:submit:own",
  "report:view:own",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...DEALER_PERMISSIONS,
  "dealer:view:all",
  "dealer:create",
  "dealer:update",
  "inventory:view:all",
  "inventory:import",
  "product:manage",
  "report:view:all",
  "report:export",
  "replenishment:generate",
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  "user:manage",
  "settings:manage",
  "email_template:manage",
  "audit_log:view",
  "integration:manage",
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  DEALER: DEALER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function isAdminRole(role: Role): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Landing route for a role immediately after sign-in. */
export function homeRouteFor(role: Role): string {
  switch (role) {
    case "DEALER":
      return "/dealer";
    case "ADMIN":
      return "/admin";
    case "SUPER_ADMIN":
      return "/super-admin";
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  DEALER: "Dealer",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};
