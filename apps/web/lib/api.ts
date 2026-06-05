import { getApiBaseUrl } from "./get-api-base-url";

export async function apiFetch(path: string, init?: RequestInit) {
  const base = getApiBaseUrl();
  const token = typeof window !== "undefined" ? localStorage.getItem("gidi_token") : null;

  const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} (no JSON): ${text.slice(0, 120)}...`);
  }

  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : (data?.message ?? "Error");
    throw new Error(msg);
  }
  return data;
}
