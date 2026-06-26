export type SortDir = "asc" | "desc";

export function sortByFullName<T>(
  items: T[],
  pick: (item: T) => { firstName: string; lastName: string },
  dir: SortDir = "asc",
): T[] {
  const sorted = [...items].sort((a, b) => {
    const na = `${pick(a).lastName} ${pick(a).firstName}`.toLocaleLowerCase("es");
    const nb = `${pick(b).lastName} ${pick(b).firstName}`.toLocaleLowerCase("es");
    return na.localeCompare(nb, "es");
  });
  return dir === "asc" ? sorted : sorted.reverse();
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalPages,
    total,
    from: total ? start + 1 : 0,
    to: Math.min(start + pageSize, total),
  };
}
