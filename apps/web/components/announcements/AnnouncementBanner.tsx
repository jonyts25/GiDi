"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Announcement = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  createdBy?: { fullName: string };
};

const DISMISS_KEY = "gidi_dismissed_announcements";

function readDismissed(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = (await apiFetch("/announcements/active")) as Announcement[];
        const dismissed = readDismissed();
        // Se vuelve a mostrar si fue editado después de descartarlo.
        setItems(data.filter((a) => dismissed[a.id] !== a.updatedAt));
      } catch {
        // Silencioso: un fallo de avisos no debe romper la navegación.
      }
    })();
  }, []);

  function dismiss(a: Announcement) {
    const dismissed = readDismissed();
    dismissed[a.id] = a.updatedAt;
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
    } catch {
      /* noop */
    }
    setItems((prev) => prev.filter((x) => x.id !== a.id));
  }

  if (!items.length) return null;

  return (
    <div className="container space-y-3 pt-4">
      {items.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-accent-yellow/40 bg-accent-yellow/10 px-4 py-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <span aria-hidden>📢</span>
                {a.title}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-subtle">{a.body}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-subtle hover:text-ink"
              onClick={() => dismiss(a)}
              aria-label="Descartar aviso"
            >
              Entendido
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
