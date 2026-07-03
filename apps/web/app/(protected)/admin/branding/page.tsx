"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { prepareFileForUpload } from "@/lib/compress-upload";
import {
  BRANDING_PRESETS,
  BrandingPreset,
  BrandingSettings,
  LOGO_UPLOAD_TIPS,
} from "@/lib/branding";
import { useBranding } from "@/components/branding/BrandingProvider";
import { GiDiLogo } from "@/components/branding/GiDiLogo";
import { hasFullAdminRole } from "@/lib/role-permissions";

export default function AdminBrandingPage() {
  const router = useRouter();
  const { branding, setBranding, refresh } = useBranding();
  const [preset, setPreset] = useState<BrandingPreset>(branding.preset);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [customPreview, setCustomPreview] = useState<string | null>(branding.customLogo?.dataUrl ?? null);
  const [customFile, setCustomFile] = useState<{ dataUrl: string; mimeType: string; fileName: string } | null>(
    branding.customLogo,
  );

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");
    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (!hasFullAdminRole(roles)) return router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    setPreset(branding.preset);
    setCustomPreview(branding.customLogo?.dataUrl ?? null);
    setCustomFile(branding.customLogo);
  }, [branding]);

  async function savePreset(next: BrandingPreset) {
    setSaving(true);
    setMsg("");
    try {
      const updated = (await apiFetch("/admin/settings/branding", {
        method: "PUT",
        body: JSON.stringify({ preset: next, customLogo: null }),
      })) as BrandingSettings;
      setBranding(updated);
      setPreset(updated.preset);
      setCustomPreview(null);
      setCustomFile(null);
      setMsg("✅ Logo predeterminado actualizado");
      await refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setSaving(true);
    setMsg("");
    try {
      const prepared = await prepareFileForUpload(file, 2 * 1024 * 1024);
      const payload = {
        dataUrl: prepared.dataUrl,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      };
      const updated = (await apiFetch("/admin/settings/branding", {
        method: "PUT",
        body: JSON.stringify({ customLogo: payload }),
      })) as BrandingSettings;
      setBranding(updated);
      setCustomPreview(prepared.dataUrl);
      setCustomFile(payload);
      setMsg("✅ Logo personalizado guardado");
      await refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearCustom() {
    setSaving(true);
    setMsg("");
    try {
      const updated = (await apiFetch("/admin/settings/branding", {
        method: "PUT",
        body: JSON.stringify({ customLogo: null }),
      })) as BrandingSettings;
      setBranding(updated);
      setCustomPreview(null);
      setCustomFile(null);
      setMsg("✅ Se usa el logo predeterminado seleccionado");
      await refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="row">
        <div>
          <div className="h1">Logo institucional</div>
          <p className="sub">Elige uno de los logos oficiales o sube uno personalizado.</p>
        </div>
        <Link className="btn" href="/dashboard">
          ← Dashboard
        </Link>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Vista previa actual</h3>
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="sub" style={{ marginBottom: 8 }}>
              Encabezado
            </p>
            <GiDiLogo variant="header" />
          </div>
          <div>
            <p className="sub" style={{ marginBottom: 8 }}>
              Login
            </p>
            <GiDiLogo variant="login" />
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Logos oficiales</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {BRANDING_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={saving}
              onClick={() => void savePreset(p.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                preset === p.id && !customFile ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.file} alt={p.label} className="mx-auto h-24 w-auto max-w-full object-contain" />
              <div className="mt-2 text-sm font-semibold">{p.label}</div>
              <div className="text-xs text-subtle">{p.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Logo personalizado</h3>
        <ul className="sub" style={{ marginTop: 0, paddingLeft: 18 }}>
          {LOGO_UPLOAD_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>

        <div style={{ marginTop: 12 }}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={saving}
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />
        </div>

        {customPreview ? (
          <div style={{ marginTop: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customPreview} alt="Logo personalizado" className="h-24 w-auto max-w-full object-contain" />
            <button type="button" className="btn" style={{ marginTop: 10 }} disabled={saving} onClick={() => void clearCustom()}>
              Quitar logo personalizado
            </button>
          </div>
        ) : null}
      </section>

      {msg ? <p className="sub" style={{ marginTop: 12 }}>{msg}</p> : null}
    </main>
  );
}
