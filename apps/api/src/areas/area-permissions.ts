import { TEXT_ONLY_AREA_KEYS } from "./area-catalog";

type AreaLike = { key: string; trackingMode?: string };

/** Áreas que cada rol puede usar al crear seguimientos. */
export function filterAreasForUserRoles(roles: string[], areas: AreaLike[]): AreaLike[] {
  const isAdmin = roles.some((r) => r === "ADMIN" || r === "SUPERADMIN");
  if (isAdmin) return areas;

  if (roles.includes("THERAPIST")) {
    return areas.filter((a) => a.trackingMode === "MONTHLY_GRID");
  }

  if (roles.includes("PARENT")) {
    return areas.filter((a) => a.key === "FAMILIAR");
  }

  if (roles.includes("SECRETARY")) {
    return areas.filter((a) => a.key === "ADMINISTRATIVO");
  }

  return [];
}

export function canRoleUseArea(roles: string[], areaKey: string, trackingMode?: string): boolean {
  const filtered = filterAreasForUserRoles(roles, [{ key: areaKey, trackingMode }]);
  return filtered.length > 0;
}

export function isTextOnlyAreaKey(key: string): boolean {
  return TEXT_ONLY_AREA_KEYS.has(key);
}
