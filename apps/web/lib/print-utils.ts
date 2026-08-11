/** Espera a que el DOM de impresión esté montado y las imágenes (p. ej. logo) hayan cargado. */
export async function waitForPrintReady(rootSelector: string, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const root = document.querySelector(rootSelector);
    if (root) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  const root = document.querySelector(rootSelector);
  if (!root) return;

  const images = root.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, timeoutMs);
        }),
    ),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
