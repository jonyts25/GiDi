/** Abre un data URL en pestaña nueva vía Blob (evita bloqueo de navegadores en PDF). */
export function openDataUrlInNewTab(dataUrl: string, mimeType: string, fileName: string) {
  const base64 = dataUrl.includes(",") ? (dataUrl.split(",")[1] ?? "") : dataUrl;
  const mime =
    mimeType ||
    dataUrl.match(/^data:([^;,]+)/)?.[1] ||
    (fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error("Permita ventanas emergentes para ver el archivo.");
  }
  w.document.title = fileName;
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
