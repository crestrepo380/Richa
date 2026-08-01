import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  Package,
  Plug,
  ScrollText,
  Settings,
  Store,
  Upload,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission, Role } from "@/lib/auth/roles";
import { hasPermission } from "@/lib/auth/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Item is hidden unless the user's role grants this capability. */
  permission: Permission;
}

/**
 * Navigation is derived from the same permission matrix that guards the routes,
 * so a link can never appear for a user who would be bounced on click.
 */
const NAV_ITEMS: NavItem[] = [
  // Dealer
  {
    href: "/dealer",
    label: "My Inventory",
    icon: Boxes,
    permission: "inventory:view:own",
  },
  {
    href: "/dealer/history",
    label: "My Submissions",
    icon: ClipboardList,
    permission: "report:view:own",
  },
  // Admin
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "inventory:view:all",
  },
  { href: "/admin/dealers", label: "Dealers", icon: Store, permission: "dealer:view:all" },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    permission: "product:manage",
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: Boxes,
    permission: "inventory:view:all",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: FileText,
    permission: "report:view:all",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    permission: "report:view:all",
  },
  {
    href: "/admin/import",
    label: "Import",
    icon: Upload,
    permission: "inventory:import",
  },
  // Super admin
  { href: "/super-admin/users", label: "Users", icon: Users, permission: "user:manage" },
  {
    href: "/super-admin/email-templates",
    label: "Email Templates",
    icon: Mail,
    permission: "email_template:manage",
  },
  {
    href: "/super-admin/integrations",
    label: "Integrations",
    icon: Plug,
    permission: "integration:manage",
  },
  {
    href: "/super-admin/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    permission: "audit_log:view",
  },
  {
    href: "/super-admin/settings",
    label: "Settings",
    icon: Settings,
    permission: "settings:manage",
  },
];

export function navItemsFor(role: Role): NavItem[] {
  const items = NAV_ITEMS.filter((item) => hasPermission(role, item.permission));

  // Admins inherit dealer permissions so they can see the dealer experience,
  // but the dealer-scoped pages have no meaning without a dealer attached.
  if (role !== "DEALER") {
    return items.filter((item) => !item.href.startsWith("/dealer"));
  }

  return items;
}
