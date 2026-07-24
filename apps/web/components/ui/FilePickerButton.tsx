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
