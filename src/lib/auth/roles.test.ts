import { describe, expect, it } from "vitest";
import { hasPermission, homeRouteFor, isAdminRole, permissionsFor } from "./roles";

describe("permission matrix", () => {
  it("lets a dealer manage only their own inventory", () => {
    expect(hasPermission("DEALER", "inventory:view:own")).toBe(true);
    expect(hasPermission("DEALER", "inventory:update:own")).toBe(true);
    expect(hasPermission("DEALER", "report:submit:own")).toBe(true);
  });

  it("denies a dealer any cross-dealer or staff capability", () => {
    for (const permission of [
      "dealer:view:all",
      "inventory:view:all",
      "inventory:import",
      "report:export",
      "user:manage",
      "audit_log:view",
    ] as const) {
      expect(hasPermission("DEALER", permission)).toBe(false);
    }
  });

  it("gives an admin the full operational set but no system administration", () => {
    expect(hasPermission("ADMIN", "dealer:create")).toBe(true);
    expect(hasPermission("ADMIN", "inventory:import")).toBe(true);
    expect(hasPermission("ADMIN", "replenishment:generate")).toBe(true);
    expect(hasPermission("ADMIN", "user:manage")).toBe(false);
    expect(hasPermission("ADMIN", "email_template:manage")).toBe(false);
    expect(hasPermission("ADMIN", "audit_log:view")).toBe(false);
  });

  it("gives a super admin everything an admin has, plus system administration", () => {
    const adminPermissions = permissionsFor("ADMIN");
    for (const permission of adminPermissions) {
      expect(hasPermission("SUPER_ADMIN", permission)).toBe(true);
    }
    expect(hasPermission("SUPER_ADMIN", "user:manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "integration:manage")).toBe(true);
  });
});

describe("isAdminRole", () => {
  it("treats both staff roles as administrative", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isAdminRole("DEALER")).toBe(false);
  });
});

describe("homeRouteFor", () => {
  it("sends each role to its own landing page", () => {
    expect(homeRouteFor("DEALER")).toBe("/dealer");
    expect(homeRouteFor("ADMIN")).toBe("/admin");
    expect(homeRouteFor("SUPER_ADMIN")).toBe("/super-admin");
  });
});
