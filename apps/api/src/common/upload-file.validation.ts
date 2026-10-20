import { BadRequestException } from "@nestjs/common";

export const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function normalizeMime(mime: string): string {
  return mime.trim().toLowerCase();
}

function parseDataUrlHeaderMime(dataUrl: string): string {
  return normalizeMime(dataUrl.split(";")[0]?.replace("data:", "") ?? "");
}

function approxBytesFromDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

/** Valida data URL de subida: tipo permitido, mimes coherentes, tamaño y nombre. */
export function assertValidUploadDataUrl(fileName: string, mimeType: string, dataUrl: string): void {
  if (!fileName.trim()) {
    throw new BadRequestException("Nombre de archivo inválido");
  }

  if (!dataUrl.startsWith("data:")) {
    throw new BadRequestException("Formato de archivo inválido");
  }

  const headerMime = parseDataUrlHeaderMime(dataUrl);
  const declaredMime = normalizeMime(mimeType);

  if (!ALLOWED_UPLOAD_MIMES.has(headerMime) || !ALLOWED_UPLOAD_MIMES.has(declaredMime)) {
    throw new BadRequestException("Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP).");
  }

  if (headerMime !== declaredMime) {
    throw new BadRequestException("El tipo de archivo no coincide con el contenido.");
  }

  const approxBytes = approxBytesFromDataUrl(dataUrl);
  if (approxBytes > UPLOAD_MAX_BYTES) {
    throw new BadRequestException(
      "Archivo demasiado grande (máx. 20 MB). Intente una foto más pequeña o comprima el PDF.",
    );
  }
}
