export function readStoredUser(): { roles?: string[]; email?: string; [key: string]: unknown } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("gidi_user");
    return raw ? (JSON.parse(raw) as { roles?: string[]; email?: string }) : null;
  } catch {
    localStorage.removeItem("gidi_user");
    localStorage.removeItem("gidi_token");
    return null;
  }
}
