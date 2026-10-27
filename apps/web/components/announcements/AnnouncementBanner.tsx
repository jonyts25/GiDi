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

type InternalUnreadEntry = {
  followUpId: string;
  patientId: string;
  patientName: string;
  authorName: string;
  updatedAt: string;
};

type FeedbackUnreadEntry = {
  feedbackId: string;
  programId: string;
  patientName: string;
  authorName: string;
  periodYear: number;
  periodMonth: number;
  createdAt: string;
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

function internalUnreadSummary(count: number): string {
  if (count === 1) return "1 mensaje nuevo de comunicación interna";
  return `${count} mensajes nuevos de comunicación interna`;
}

function feedbackUnreadSummary(count: number): string {
  if (count === 1) return "1 retroalimentación nueva";
  return `${count} retroalimentaciones nuevas`;
}

const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `hace ${diffD} d`;
  return date.toLocaleDateString("es-MX");
}

function followUpDetailPath(followUpId: string): string {
  if (typeof window === "undefined") return `/admin/followups/${followUpId}`;
  try {
    const raw = localStorage.getItem("gidi_user");
    const roles: string[] = raw ? (JSON.parse(raw).roles ?? []) : [];
    const onlyTherapist = roles.length === 1 && roles[0] === "THERAPIST";
    return onlyTherapist
      ? `/therapist/followups/${followUpId}`
      : `/admin/followups/${followUpId}`;
  } catch {
    return `/admin/followups/${followUpId}`;
  }
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [revalExpanded, setRevalExpanded] = useState(false);
  const [internalUnread, setInternalUnread] = useState<InternalUnreadEntry[]>([]);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [feedbackUnread, setFeedbackUnread] = useState<FeedbackUnreadEntry[]>([]);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const data = (await apiFetch("/followups/internal-unread")) as InternalUnreadEntry[];
        setInternalUnread(Array.isArray(data) ? data : []);
      } catch {
        setInternalUnread([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem("gidi_user");
        const roles: string[] = raw ? (JSON.parse(raw).roles ?? []) : [];
        if (!roles.includes("THERAPIST")) {
          setFeedbackUnread([]);
          return;
        }
        const data = (await apiFetch("/feedback/unread")) as FeedbackUnreadEntry[];
        setFeedbackUnread(Array.isArray(data) ? data : []);
      } catch {
        setFeedbackUnread([]);
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

  if (!regularItems.length && !revalEntries.length && !internalUnread.length && !feedbackUnread.length)
    return null;

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

      {feedbackUnread.length > 0 && (
        <div className="rounded-xl border border-teal-400/40 bg-teal-500/10 px-4 py-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span aria-hidden>📝</span>
              {feedbackUnreadSummary(feedbackUnread.length)}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-subtle hover:text-ink"
              onClick={() => setFeedbackExpanded((v) => !v)}
              aria-expanded={feedbackExpanded}
            >
              {feedbackExpanded ? "Ocultar" : "Ver"}
            </button>
          </div>

          {feedbackExpanded && (
            <ul className="mt-2 space-y-1 border-t border-teal-400/25 pt-2 text-sm">
              {feedbackUnread.map((entry) => (
                <li key={entry.feedbackId}>
                  <Link
                    href={`/therapist/programs/${entry.programId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {entry.patientName} · {MONTH_SHORT[entry.periodMonth - 1] ?? entry.periodMonth} · de{" "}
                    {entry.authorName} · {formatRelativeTime(entry.createdAt)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {internalUnread.length > 0 && (
        <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span aria-hidden>💬</span>
              {internalUnreadSummary(internalUnread.length)}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-subtle hover:text-ink"
              onClick={() => setInternalExpanded((v) => !v)}
              aria-expanded={internalExpanded}
            >
              {internalExpanded ? "Ocultar" : "Ver"}
            </button>
          </div>

          {internalExpanded && (
            <ul className="mt-2 space-y-1 border-t border-violet-400/25 pt-2 text-sm">
              {internalUnread.map((entry) => (
                <li key={entry.followUpId}>
                  <Link
                    href={followUpDetailPath(entry.followUpId)}
                    className="font-medium text-primary hover:underline"
                  >
                    {entry.patientName} · escribió {entry.authorName} ·{" "}
                    {formatRelativeTime(entry.updatedAt)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
