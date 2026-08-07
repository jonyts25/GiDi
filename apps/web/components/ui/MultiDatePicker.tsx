"use client";

import { useMemo, useState } from "react";
import { localDateInputValue } from "@/lib/date-utils";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function MultiDatePicker(props: {
  selected: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
}) {
  const { selected, onChange, disabled = false } = props;
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;

  function toggleDate(iso: string) {
    if (disabled) return;
    if (selectedSet.has(iso)) {
      onChange(selected.filter((d) => d !== iso));
    } else {
      onChange([...selected, iso].sort());
    }
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toIso(viewYear, viewMonth, d));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn rounded-lg px-2 py-1 text-sm" onClick={prevMonth} disabled={disabled}>
          ‹
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button type="button" className="btn rounded-lg px-2 py-1 text-sm" onClick={nextMonth} disabled={disabled}>
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 font-medium text-subtle">
            {d}
          </div>
        ))}
        {cells.map((iso, idx) =>
          iso ? (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => toggleDate(iso)}
              className={`rounded-lg py-1.5 text-sm transition ${
                selectedSet.has(iso)
                  ? "bg-primary font-semibold text-white"
                  : iso === localDateInputValue()
                    ? "border border-primary/50 text-ink hover:bg-surface-elevated"
                    : "text-ink hover:bg-surface-elevated"
              }`}
            >
              {parseIso(iso).d}
            </button>
          ) : (
            <div key={`empty-${idx}`} />
          ),
        )}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((iso) => (
            <span
              key={iso}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium"
            >
              {iso}
              {!disabled ? (
                <button type="button" className="text-subtle hover:text-danger" onClick={() => toggleDate(iso)}>
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-subtle">Haga clic en las fechas del calendario para seleccionarlas.</p>
      )}
    </div>
  );
}
