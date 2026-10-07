"use client";

type ErrorFallbackProps = {
  onReload?: () => void;
};

export function ErrorFallback({ onReload }: ErrorFallbackProps) {
  const reload = onReload ?? (() => window.location.reload());

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg text-[var(--color-ink)]">Algo salió mal. Recarga la página.</p>
      <button
        type="button"
        onClick={reload}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
      >
        Recargar
      </button>
    </div>
  );
}
