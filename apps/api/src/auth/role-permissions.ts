import { AuthUser } from "./auth-user";

export function hasFullAdminRole(roles: string[] = []): boolean {
  return roles.some((r) => r === "ADMIN" || r === "SUPERADMIN");
}

export function hasOfficeStaffRole(roles: string[] = []): boolean {
  return hasFullAdminRole(roles) || roles.includes("SECRETARY");
}

export function canViewRevenueOverview(roles: string[] = []): boolean {
  return hasFullAdminRole(roles);
}

export function userHasFullAdminRole(user: AuthUser): boolean {
  return hasFullAdminRole(user.roles);
}

export function userHasOfficeStaffRole(user: AuthUser): boolean {
  return hasOfficeStaffRole(user.roles);
}
