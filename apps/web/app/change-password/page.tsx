"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSave() {
    const cur = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!cur) {
      setMsg("Falta la contraseña actual.");
      return;
    }
    if (!next || next.length < 8) {
      setMsg("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      setMsg("La nueva contraseña y la confirmación no coinciden.");
      return;
    }

    setMsg("Guardando...");

    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });

      const userRaw = localStorage.getItem("gidi_user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        user.mustChangePassword = false;
        localStorage.setItem("gidi_user", JSON.stringify(user));
      }

      setMsg("✅ Contraseña actualizada");
      router.replace("/dashboard");
    } catch (e: any) {
      setMsg(e.message || "Error");
    }
  }

  return (
    <main style={{ paddingTop: 40 }}>
      <div className="card">
        <h1>Cambiar contraseña</h1>
        <p>Debes cambiar tu contraseña temporal antes de continuar.</p>

        {msg && <p className="sub">{msg}</p>}

        <div style={{ position: "relative", marginTop: 10 }}>
  <input
    className="input"
    type={show ? "text" : "password"}
    placeholder="Contraseña actual"
    value={currentPassword}
    onChange={(e) => setCurrentPassword(e.target.value)}
    style={{ paddingRight: 40 }}
  />
  <span
    onClick={() => setShow((s) => !s)}
    style={{
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      cursor: "pointer",
      fontSize: 18,
    }}
  >
    👁
  </span>
</div>

<div style={{ position: "relative", marginTop: 10 }}>
  <input
    className="input"
    type={show ? "text" : "password"}
    placeholder="Nueva contraseña (mínimo 8)"
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    style={{ paddingRight: 40 }}
  />
</div>

<div style={{ position: "relative", marginTop: 10 }}>
  <input
    className="input"
    type={show ? "text" : "password"}
    placeholder="Confirmar nueva contraseña"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    style={{ paddingRight: 40 }}
  />
</div>


        <button className="btn" onClick={onSave} style={{ marginTop: 15 }}>
          Guardar
        </button>
      </div>
    </main>
  );
}
