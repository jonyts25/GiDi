import { buildCorsOptions } from "./cors-options";

describe("buildCorsOptions", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("con CORS_ORIGINS vacío permite cualquier origen", async () => {
    delete process.env.CORS_ORIGINS;
    const { origin } = buildCorsOptions();
    await new Promise<void>((resolve) => {
      (origin as (o: string | undefined, cb: (e: Error | null, a?: boolean) => void) => void)(
        "https://anything.up.railway.app",
        (err, ok) => {
          expect(err).toBeNull();
          expect(ok).toBe(true);
          resolve();
        },
      );
    });
  });

  it("con CORS_ORIGINS definido solo permite orígenes listados", async () => {
    process.env.CORS_ORIGINS = "https://allowed.example,https://app.example";
    const { origin } = buildCorsOptions();
    await new Promise<void>((resolve) => {
      (origin as (o: string | undefined, cb: (e: Error | null, a?: boolean) => void) => void)(
        "https://allowed.example",
        (err, ok) => {
          expect(err).toBeNull();
          expect(ok).toBe(true);
          resolve();
        },
      );
    });
    await new Promise<void>((resolve) => {
      (origin as (o: string | undefined, cb: (e: Error | null, a?: boolean) => void) => void)(
        "https://evil.example",
        (err, ok) => {
          expect(err).toBeNull();
          expect(ok).toBe(false);
          resolve();
        },
      );
    });
  });
});
