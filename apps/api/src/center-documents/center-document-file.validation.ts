import { BadRequestException } from "@nestjs/common";

const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_EXACT = new Set(["application/pdf"]);

export function assertValidCenterDocumentFile(fileName: string, mimeType: string, dataUrl: string): void {
  if (!dataUrl.startsWith("data:")) {
    throw new BadRequestException("Formato de archivo inválido");
  }

  const headerMime = dataUrl.split(";")[0]?.replace("data:", "") ?? "";
  const effectiveMime = mimeType || headerMime;
  const allowed =
    ALLOWED_MIME_EXACT.has(effectiveMime) ||
    ALLOWED_MIME_PREFIXES.some((p) => effectiveMime.startsWith(p)) ||
    ALLOWED_MIME_EXACT.has(headerMime) ||
    ALLOWED_MIME_PREFIXES.some((p) => headerMime.startsWith(p));

  if (!allowed) {
    throw new BadRequestException("Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP).");
  }

  const base64 = dataUrl.split(",")[1] ?? "";
  const approxBytes = Math.ceil((base64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    throw new BadRequestException(
      "Archivo demasiado grande (máx. 20 MB). Intente una foto más pequeña o comprima el PDF.",
    );
  }

  if (!fileName.trim()) {
    throw new BadRequestException("Nombre de archivo inválido");
  }
}
