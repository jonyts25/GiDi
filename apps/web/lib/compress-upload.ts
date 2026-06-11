/** Comprime imágenes antes de subirlas como data URL (reduce peso en base64). */
export async function prepareFileForUpload(
  file: File,
  maxBytes = 18 * 1024 * 1024,
): Promise<{ dataUrl: string; fileName: string; mimeType: string }> {
  if (!file.type.startsWith("image/")) {
    const dataUrl = await readAsDataUrl(file);
    ensureSize(dataUrl, maxBytes, file.name);
    return { dataUrl, fileName: file.name, mimeType: file.type || "application/octet-stream" };
  }

  let quality = 0.88;
  let width = 2400;
  let dataUrl = await compressImage(file, width, quality);

  while (estimateBytes(dataUrl) > maxBytes && (quality > 0.45 || width > 800)) {
    if (quality > 0.45) quality -= 0.12;
    else width = Math.round(width * 0.75);
    dataUrl = await compressImage(file, width, quality);
  }

  ensureSize(dataUrl, maxBytes, file.name);
  const ext = file.name.replace(/\.[^.]+$/, "") || "foto";
  return { dataUrl, fileName: `${ext}.jpg`, mimeType: "image/jpeg" };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function estimateBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

function ensureSize(dataUrl: string, maxBytes: number, fileName: string) {
  if (estimateBytes(dataUrl) > maxBytes) {
    throw new Error(
      `«${fileName}» sigue siendo muy pesado tras comprimir. Use un archivo menor a 20 MB o una foto más pequeña.`,
    );
  }
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo procesar la imagen"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}
