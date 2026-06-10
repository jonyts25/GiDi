"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../lib/get-api-base-url";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Entrando...");

    const base = getApiBaseUrl();

    try {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ?? `HTTP ${res.status}`
        );
        return;
      }

      // ✅ Guardar lo mínimo y correcto
      localStorage.setItem("gidi_token", data.token);
      localStorage.setItem("gidi_user", JSON.stringify(data.user));

      // ✅ Routing por mustChangePassword
      if (data?.user?.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setMsg(`❌ Error de red: ${err?.message ?? "No se pudo conectar"}`);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-ink">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-lg ring-2 ring-accent-yellow/40">
          G
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GiDi</h1>
          <p className="text-sm text-subtle">Acceso institucional</p>
        </div>
      </div>

      <form className="card space-y-4 border-l-4 border-l-primary" onSubmit={onLogin} autoComplete="off">
        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-subtle">Contraseña</span>
          <div className="relative">
            <input
              className="input pr-11"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-lg text-subtle hover:bg-white/10 hover:text-ink"
              onClick={() => setShow((s) => !s)}
              title={show ? "Ocultar" : "Mostrar"}
            >
              👁
            </button>
          </div>
        </label>

        <button type="submit" className="btn-primary w-full rounded-xl py-3 text-sm font-semibold shadow">
          Entrar
        </button>
      </form>

      {msg ? <p className="mt-4 text-sm text-subtle">{msg}</p> : null}
    </main>
  );
}
