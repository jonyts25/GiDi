"use client";

export function SaveBanner({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  if (!message) return null;
  const cls =
    type === "success"
      ? "border-success/40 bg-success/10 text-ink"
      : "border-danger/40 bg-danger/10 text-ink";
  return (
    <p className={`rounded-xl border px-4 py-3 text-sm font-medium ${cls}`} role="status">
      {message}
    </p>
  );
}
