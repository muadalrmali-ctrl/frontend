export const APP_ROLES = [
  "admin",
  "receptionist",
  "technician",
  "store_manager",
  "technician_manager",
  "maintenance_manager",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "مسؤول إدارة",
  receptionist: "موظف استقبال",
  technician: "فني",
  store_manager: "مدير مخزن",
  technician_manager: "مسؤول الفنيين",
  maintenance_manager: "مدير الصيانة",
};

export const RESOURCE_ACCESS: Record<string, AppRole[]> = {
  dashboard: ["admin", "receptionist", "technician", "store_manager", "technician_manager", "maintenance_manager"],
  cases: ["admin", "receptionist", "store_manager", "technician", "technician_manager", "maintenance_manager"],
  "maintenance-operations": ["admin", "receptionist", "technician", "technician_manager", "maintenance_manager"],
  inventory: ["admin", "store_manager"],
  sales: ["admin", "receptionist", "store_manager"],
  reports: ["admin", "receptionist", "store_manager", "technician_manager", "maintenance_manager"],
  accounting: ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "accounting-customers": ["admin", "receptionist"],
  "accounting-team": ["admin", "receptionist", "technician_manager", "maintenance_manager"],
  "invoice-preview": ["admin", "receptionist", "store_manager", "technician", "technician_manager", "maintenance_manager"],
};

export const isAppRole = (role: string | null | undefined): role is AppRole =>
  Boolean(role && APP_ROLES.includes(role as AppRole));

export const canAccessResource = (role: string | null | undefined, resourceName: string) => {
  if (!isAppRole(role)) return false;
  const allowedRoles = RESOURCE_ACCESS[resourceName];
  if (!allowedRoles) return role === "admin";
  return allowedRoles.includes(role);
};

export const getDefaultRouteForRole = (role: string | null | undefined) => {
  switch (role) {
    case "technician":
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
    return ["technician", "store_manager", "receptionist"];
  }

  if (role === "technician_manager") {
    return ["technician"];
  }

  return [];
};
