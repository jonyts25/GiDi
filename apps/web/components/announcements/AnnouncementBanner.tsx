"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Announcement = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  createdBy?: { fullName: string };
};

type RevalEntry = {
  id: string;
  name: string;
  patientId: string;
};

const DISMISS_KEY = "gidi_dismissed_announcements";
const REVAL_PREFIX = "[REVALUACIÓN]";
const REVAL_PATIENT_RE = /reval-patient:([0-9a-f-]{36})/i;

function readDismissed(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function isRevaluationAnnouncement(a: Announcement): boolean {
  return a.title.startsWith(REVAL_PREFIX);
}

function revalPatientId(body: string): string | null {
  return body.match(REVAL_PATIENT_RE)?.[1] ?? null;
}

function revalDisplayName(title: string): string {
  return title.startsWith(REVAL_PREFIX) ? title.slice(REVAL_PREFIX.length).trimStart() : title;
}

function revaluationSummary(count: number): string {
  if (count === 1) return "1 paciente pendiente de revaloración";
  return `${count} pacientes pendientes de revaloración`;
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [revalExpanded, setRevalExpanded] = useState(false);

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

  const { regularItems, revalEntries } = useMemo(() => {
    const regular: Announcement[] = [];
    const reval: RevalEntry[] = [];

    for (const a of items) {
      if (isRevaluationAnnouncement(a)) {
        const patientId = revalPatientId(a.body);
        if (patientId) {
          reval.push({ id: a.id, name: revalDisplayName(a.title), patientId });
        }
      } else {
        regular.push(a);
      }
    }

    return { regularItems: regular, revalEntries: reval };
  }, [items]);

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

  if (!regularItems.length && !revalEntries.length) return null;

  return (
    <div className="container space-y-3 pt-4">
      {regularItems.map((a) => (
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

      {revalEntries.length > 0 && (
        <div className="rounded-xl border border-accent-yellow/40 bg-accent-yellow/10 px-4 py-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span aria-hidden>📋</span>
              {revaluationSummary(revalEntries.length)}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-subtle hover:text-ink"
              onClick={() => setRevalExpanded((v) => !v)}
              aria-expanded={revalExpanded}
            >
              {revalExpanded ? "Ocultar" : "Ver pacientes"}
            </button>
          </div>

          {revalExpanded && (
            <ul className="mt-2 space-y-1 border-t border-accent-yellow/25 pt-2 text-sm">
              {revalEntries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/admin/patients/${entry.patientId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
