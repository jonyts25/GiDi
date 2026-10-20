const TAB_VIEW_MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function resolveMime(dataUrl: string, mimeType: string, fileName: string): string {
  const fromArg = mimeType.trim().toLowerCase();
  if (fromArg) return fromArg;
  const fromHeader = dataUrl.match(/^data:([^;,]+)/)?.[1]?.trim().toLowerCase();
  if (fromHeader) return fromHeader;
  if (fileName.toLowerCase().endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

/** Abre un data URL en pestaña nueva vía Blob (evita bloqueo de navegadores en PDF). */
export function openDataUrlInNewTab(dataUrl: string, mimeType: string, fileName: string) {
  const base64 = dataUrl.includes(",") ? (dataUrl.split(",")[1] ?? "") : dataUrl;
  const resolvedMime = resolveMime(dataUrl, mimeType, fileName);
  const openInTab = TAB_VIEW_MIMES.has(resolvedMime);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: openInTab ? resolvedMime : "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  if (openInTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  } else {
    a.download = fileName;
  }
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
