"use client";

import { useRef } from "react";

export function FilePickerButton(props: {
  label: string;
  file: File | null;
  onPick: (file: File | null) => void;
  accept?: string;
}) {
  const { label, file, onPick, accept = "image/*,.pdf" } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className="btn"
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Cambiar archivo" : "Seleccionar archivo"}
        </button>
        {file ? (
          <>
            <span className="sub" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </span>
            <button
              type="button"
              className="btn"
              style={{ color: "var(--color-danger, #c0392b)" }}
              onClick={() => {
                onPick(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Quitar
            </button>
          </>
        ) : (
          <span className="sub" style={{ opacity: 0.7 }}>Ningún archivo seleccionado</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

/** Selector de uno o varios archivos (p. ej. varias revaloraciones). */
export function MultiFilePickerButton(props: {
  label: string;
  files: File[];
  onPick: (files: File[]) => void;
  accept?: string;
}) {
  const { label, files, onPick, accept = "image/*,.pdf" } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          {files.length ? "Agregar más archivos" : "Seleccionar archivo(s)"}
        </button>
        {files.length ? (
          <button
            type="button"
            className="btn"
            style={{ color: "var(--color-danger, #c0392b)" }}
            onClick={() => {
              onPick([]);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Quitar todos
          </button>
        ) : (
          <span className="sub" style={{ opacity: 0.7 }}>Ningún archivo seleccionado</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="sr-only"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (!picked.length) return;
            onPick([...files, ...picked]);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>
      {files.length ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="sub" style={{ marginBottom: 4 }}>
              {f.name}{" "}
              <button
                type="button"
                className="btn"
                style={{ marginLeft: 6, padding: "2px 8px", fontSize: 12 }}
                onClick={() => onPick(files.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
