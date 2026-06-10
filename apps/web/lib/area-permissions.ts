type AreaLike = { id: string; key: string; name: string; trackingMode?: string | null };

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
