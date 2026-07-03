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
  return hasFullAdminRole(roles) || roles.includes("SECRETARY");
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
