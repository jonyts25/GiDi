export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Administrativo",
  SECRETARY: "Secretaria",
  THERAPIST: "Terapeuta",
  PARENT: "Papá/Mamá",
  SCHOOL: "Escuela",
  FINANCE: "Finanzas",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

export function hasFullAdminRole(roles: string[] = []): boolean {
  return roles.some((r) => r === "ADMIN" || r === "SUPERADMIN");
}

export function hasOfficeStaffRole(roles: string[] = []): boolean {
  return hasFullAdminRole(roles) || roles.includes("SECRETARY") || roles.includes("FINANCE");
}

const STAFF_ROLE_KEYS = ["SUPERADMIN", "ADMIN", "SECRETARY", "THERAPIST", "FINANCE"] as const;

export function hasStaffRole(roles: string[] = []): boolean {
  return roles.some((r) => (STAFF_ROLE_KEYS as readonly string[]).includes(r));
}

/** Papá/Mamá portal — excludes users who also have internal staff profiles. */
export function hasParentPortalAccess(roles: string[] = []): boolean {
  return roles.includes("PARENT") && !hasStaffRole(roles);
}

export function canViewRevenueOverview(roles: string[] = []): boolean {
  return hasFullAdminRole(roles);
}

export function labelForRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function primaryRoleLabel(roles: string[] = []): string {
  const order = ["SUPERADMIN", "ADMIN", "SECRETARY", "THERAPIST", "PARENT", "SCHOOL", "FINANCE"];
  const key = order.find((r) => roles.includes(r));
  return key ? labelForRole(key) : "Usuario";
}
