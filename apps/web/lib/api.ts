import { getApiBaseUrl } from "./get-api-base-url";

export async function apiFetch(path: string, init?: RequestInit, timeoutMs?: number) {
  const base = getApiBaseUrl();
  const token = typeof window !== "undefined" ? localStorage.getItem("gidi_token") : null;

  const controller = timeoutMs != null ? new AbortController() : null;
  const timeoutId =
    controller && timeoutMs != null
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  let res: Response;
  try {
    res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      signal: controller?.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Intente de nuevo con menos áreas seleccionadas.");
    }
    throw err;
  }

  if (timeoutId) clearTimeout(timeoutId);

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (res.status === 401 && token && !normalizedPath.startsWith("/auth/")) {
    localStorage.removeItem("gidi_token");
    localStorage.removeItem("gidi_user");
    window.location.replace("/");
    throw new Error("Su sesión expiró. Inicie sesión de nuevo.");
  }

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
