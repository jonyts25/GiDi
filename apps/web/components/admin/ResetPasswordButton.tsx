"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onReset() {
    setLoading(true);
    setError(null);
    setTempPassword(null);

    try {
      const data = await apiFetch(`/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      setTempPassword(data?.tempPassword ?? null);
      if (!data?.tempPassword) setError("No llegó tempPassword en la respuesta");
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn" type="button" onClick={onReset} disabled={loading}>
        {loading ? "Reseteando..." : "Reset password"}
      </button>

      {tempPassword && (
        <>
          <code style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
            {tempPassword}
          </code>
          <button className="btn" type="button" onClick={() => navigator.clipboard.writeText(tempPassword)}>
            Copiar
          </button>
          <span className="sub">(Se muestra solo una vez)</span>
        </>
      )}

      {error && <span style={{ color: "crimson" }}>{error}</span>}
    </div>
  );
}
