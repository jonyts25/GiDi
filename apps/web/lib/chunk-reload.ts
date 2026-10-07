export const CHUNK_RELOAD_KEY = "gidi_chunk_reload";
export const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

function getErrorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === "object" && error !== null && "name" in error) {
    return String((error as { name?: unknown }).name ?? "");
  }
  return "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "");
}

export function isChunkLoadError(error: unknown): boolean {
  const name = getErrorName(error);
  const message = getErrorMessage(error);

  return (
    name === "ChunkLoadError" ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed")
  );
}

/** Recarga una sola vez por ventana en 30 s; devuelve true si se disparó la recarga. */
export function attemptChunkReload(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    if (raw) {
      const last = Number(raw);
      if (!Number.isNaN(last) && Date.now() - last < CHUNK_RELOAD_COOLDOWN_MS) {
        return false;
      }
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage puede fallar en modo privado; igual intentamos recargar.
  }

  window.location.reload();
  return true;
}
