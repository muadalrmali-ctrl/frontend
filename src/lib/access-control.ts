export const APP_ROLES = [
  "admin",
  "receptionist",
  "technician",
  "store_manager",
  "technician_manager",
  "maintenance_manager",
  "branch_user",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthUserLike = {
  role?: string | null;
  permissions?: string[] | null;
  branchId?: number | null;
} | null | undefined;

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "مسؤول إدارة",
  receptionist: "موظف استقبال",
  technician: "فني",
  store_manager: "مدير مخزن",
  technician_manager: "مسؤول الفنيين",
  maintenance_manager: "مدير الصيانة",
  branch_user: "مستخدم فرع",
};

const LEGACY_RESOURCE_ACCESS: Record<string, AppRole[]> = {
  dashboard: ["admin", "receptionist", "technician", "store_manager", "technician_manager", "maintenance_manager"],
  branches: ["admin", "receptionist", "maintenance_manager"],
  cases: ["admin", "receptionist", "store_manager", "technician", "technician_manager", "maintenance_manager", "branch_user"],
  "center-receipts": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "maintenance-operations": ["admin", "receptionist", "technician", "technician_manager", "maintenance_manager", "branch_user"],
  inventory: ["admin", "store_manager"],
  sales: ["admin", "receptionist", "store_manager"],
  reports: ["admin", "receptionist", "store_manager", "technician_manager", "maintenance_manager"],
  accounting: ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "accounting-branches": ["admin", "receptionist", "maintenance_manager"],
  "accounting-customers": ["admin", "receptionist"],
  "accounting-team": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "accounting-suppliers": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "accounting-devices": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "accounting-purchases": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "accounting-daily-expenses": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "accounting-daily-cash": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "invoice-preview": ["admin", "receptionist", "store_manager", "technician", "technician_manager", "maintenance_manager", "branch_user"],
};

export const RESOURCE_PERMISSION_MAP: Record<string, string[]> = {
  dashboard: ["dashboard.view"],
  branches: ["branches.view"],
  cases: ["cases.view"],
  "center-receipts": ["cases.column.awaiting_center_receipt.view"],
  "maintenance-operations": ["maintenance_operations.view"],
  inventory: ["inventory.view"],
  sales: ["sales.view"],
  reports: ["reports.view"],
  accounting: ["accounting.view"],
  "accounting-branches": ["branches.view"],
  "accounting-customers": ["accounting.customers.view"],
  "accounting-team": ["accounting.team.view"],
  "accounting-suppliers": ["accounting.suppliers.view"],
  "accounting-devices": ["accounting.devices.view"],
  "accounting-purchases": ["accounting.purchases.view"],
  "accounting-daily-expenses": ["accounting.expenses.view"],
  "accounting-daily-cash": ["accounting.daily_cash.view"],
  "invoice-preview": [
    "cases.diagnosis.invoice.preview",
    "cases.approval.invoice.preview",
    "cases.in_progress.invoice.preview",
    "cases.repaired.invoice.preview",
    "maintenance_operations.final_invoice.view",
    "sales.view",
  ],
};

export const CASE_COLUMN_PERMISSION_MAP: Record<string, string> = {
  awaiting_center_receipt: "cases.column.awaiting_center_receipt.view",
  received: "cases.column.new.view",
  waiting_part: "cases.column.waiting.view",
  diagnosing: "cases.column.diagnosis.view",
  waiting_approval: "cases.column.approval_part_delivery.view",
  in_progress: "cases.column.in_progress.view",
  repaired: "cases.column.repaired.view",
  not_repairable: "cases.column.not_repairable.view",
};

export const REPORT_CATEGORY_PERMISSION_MAP: Record<string, string> = {
  cases: "reports.cases.view",
  technicians: "reports.technicians.view",
  inventory: "reports.inventory.view",
  sales: "reports.sales.view",
  customers: "reports.customers.view",
  operations: "reports.operations_workflow.view",
};

const resolveRole = (userOrRole: AuthUserLike | string | null | undefined) =>
  typeof userOrRole === "string" ? userOrRole : userOrRole?.role ?? null;

const resolvePermissions = (user: AuthUserLike | string | null | undefined) =>
  typeof user === "string" ? [] : user?.permissions ?? [];

export const isAppRole = (role: string | null | undefined): role is AppRole =>
  Boolean(role && APP_ROLES.includes(role as AppRole));

export const isAdminUser = (user: AuthUserLike | string | null | undefined) =>
  resolveRole(user) === "admin";

export const hasPermission = (user: AuthUserLike | string | null | undefined, permissionKey: string) => {
  if (isAdminUser(user)) return true;
  return resolvePermissions(user).includes(permissionKey);
};

export const hasAnyPermission = (user: AuthUserLike | string | null | undefined, permissionKeys: string[]) =>
  permissionKeys.some((permissionKey) => hasPermission(user, permissionKey));

export const canAccessResource = (user: AuthUserLike | string | null | undefined, resourceName: string) => {
  const requiredPermissions = RESOURCE_PERMISSION_MAP[resourceName];
  if (requiredPermissions?.length) {
    return hasAnyPermission(user, requiredPermissions);
  }

  const role = resolveRole(user);
  if (!isAppRole(role)) return false;

  const allowedRoles = LEGACY_RESOURCE_ACCESS[resourceName];
  if (!allowedRoles) {
    return role === "admin";
  }

  return allowedRoles.includes(role);
};

export const getDefaultRouteForRole = (role: string | null | undefined) => {
  switch (role) {
    case "technician":
    case "branch_user":
      return "/cases";
    case "store_manager":
      return "/inventory";
    case "technician_manager":
    case "maintenance_manager":
    case "receptionist":
    case "admin":
      return "/";
    default:
      return "/";
  }
};

export const getDefaultRouteForUser = (user: AuthUserLike | string | null | undefined) => {
  const preferredRoutes: Array<{ resource: string; path: string }> = [
    { resource: "dashboard", path: "/" },
    { resource: "center-receipts", path: "/center-receipts" },
    { resource: "cases", path: "/cases" },
    { resource: "accounting-branches", path: "/accounting/branches" },
    { resource: "maintenance-operations", path: "/maintenance-operations" },
    { resource: "inventory", path: "/inventory" },
    { resource: "sales", path: "/sales" },
    { resource: "reports", path: "/reports" },
    { resource: "accounting", path: "/accounting" },
    { resource: "accounting-purchases", path: "/accounting/purchases" },
  ];

  const accessibleRoute = preferredRoutes.find((entry) => canAccessResource(user, entry.resource));
  return accessibleRoute?.path ?? getDefaultRouteForRole(resolveRole(user));
};

export const canViewInvitations = (role: string | null | undefined) =>
  role === "admin" ||
  role === "receptionist" ||
  role === "technician_manager" ||
  role === "maintenance_manager";

export const canManageInvitations = (role: string | null | undefined) =>
  role === "admin" || role === "technician_manager" || role === "maintenance_manager";

export const getAllowedInvitationRoles = (role: string | null | undefined): AppRole[] => {
  if (role === "admin") {
    return [...APP_ROLES];
  }

  if (role === "maintenance_manager") {
    return ["technician", "store_manager", "receptionist", "branch_user"];
  }

  if (role === "technician_manager") {
    return ["technician"];
  }

  return [];
};
