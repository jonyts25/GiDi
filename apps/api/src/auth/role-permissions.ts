import { BadRequestException } from "@nestjs/common";
import { RoleKey } from "@prisma/client";
import { AuthUser } from "./auth-user";

/** Internal staff roles that must never be linked as padres/tutores. */
export const STAFF_ROLE_KEYS: RoleKey[] = [
  RoleKey.SUPERADMIN,
  RoleKey.ADMIN,
  RoleKey.SECRETARY,
  RoleKey.THERAPIST,
  RoleKey.FINANCE,
];

export function hasFullAdminRole(roles: string[] = []): boolean {
  return roles.some((r) => r === "ADMIN" || r === "SUPERADMIN");
}

export function hasOfficeStaffRole(roles: string[] = []): boolean {
  return hasFullAdminRole(roles) || roles.includes("SECRETARY");
}

export function hasStaffRole(roles: string[] = []): boolean {
  return roles.some((r) => STAFF_ROLE_KEYS.includes(r as RoleKey));
}

export function hasParentPortalAccess(roles: string[] = []): boolean {
  return roles.includes("PARENT") && !hasStaffRole(roles);
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

export function userHasParentPortalAccess(user: AuthUser): boolean {
  return hasParentPortalAccess(user.roles);
}

export function assertCanBeParent(roleKeys: RoleKey[]): void {
  const staff = roleKeys.filter((r) => STAFF_ROLE_KEYS.includes(r));
  if (staff.length) {
    throw new BadRequestException(
      `Este usuario tiene perfil de personal (${staff.join(", ")}) y no puede ser padre/tutor`,
    );
  }
}

export function assertRoleSetCompatible(roleKeys: RoleKey[]): void {
  if (roleKeys.includes(RoleKey.PARENT) && roleKeys.some((r) => STAFF_ROLE_KEYS.includes(r))) {
    throw new BadRequestException(
      "Los perfiles de personal (admin, secretaria, terapeuta, finanzas) no pueden combinarse con Papá/Mamá",
    );
  }
}
