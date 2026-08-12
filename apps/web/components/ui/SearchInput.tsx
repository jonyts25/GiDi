"use client";

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      className="input w-full max-w-sm"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function filterByQuery<T>(
  items: T[],
  query: string,
  pick: (item: T) => string,
): T[] {
  const q = normalize(query.trim());
  if (!q) return items;
  return items.filter((item) => normalize(pick(item)).includes(q));
}
