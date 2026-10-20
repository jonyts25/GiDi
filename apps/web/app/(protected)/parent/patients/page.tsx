"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { useRouter } from "next/navigation";
import { hasOfficeStaffRole, hasParentPortalAccess } from "@/lib/role-permissions";
import { openDataUrlInNewTab } from "@/lib/open-data-url";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  notes?: string | null;
};

type CenterDoc = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
};

export default function ParentPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [centerDocs, setCenterDocs] = useState<CenterDoc[] | null>(null);
  const [msg, setMsg] = useState("Cargando...");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const userRaw = localStorage.getItem("gidi_user");
    if (!token || !userRaw) return router.replace("/");

    const roles: string[] = JSON.parse(userRaw).roles ?? [];
    if (hasOfficeStaffRole(roles)) return router.replace("/admin/patients");
    if (!hasParentPortalAccess(roles)) return router.replace("/dashboard");

    (async () => {
      try {
        const data = await apiFetch("/parent/patients");
        setPatients(data);
        setMsg("");
      } catch (e: any) {
        setMsg(e.message);
      }

      try {
        const docs = (await apiFetch("/center-documents")) as CenterDoc[];
        if (docs?.length) setCenterDocs(docs);
      } catch {
        /* omit card on failure */
      }
    })();
  }, [router]);

  async function openCenterDoc(id: string) {
    try {
      const data = (await apiFetch(`/center-documents/${id}/file`)) as {
        dataUrl: string;
        fileName: string;
        mimeType: string;
      };
      openDataUrlInNewTab(data.dataUrl, data.mimeType, data.fileName);
    } catch {
      /* ignore — card is informational */
    }
  }

  return (
    <main style={{ paddingTop: 18 }}>
      <div className="card">
        <div className="h1">Mis hijos</div>
        {msg && <p className="sub">{msg}</p>}
      </div>

      {centerDocs && centerDocs.length > 0 ? (
        <section className="card space-y-3" style={{ marginTop: 12 }}>
          <h2 className="text-lg font-semibold">Documentos del centro</h2>
          <ul className="space-y-2 text-sm">
            {centerDocs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <div>
                  <div className="font-medium">{doc.title}</div>
                  <div className="text-xs text-subtle">Actualizado: {new Date(doc.updatedAt).toLocaleString("es-MX")}</div>
                </div>
                <button type="button" className="btn rounded-lg px-2 py-1 text-xs" onClick={() => void openCenterDoc(doc.id)}>
                  Ver
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 12 }}>
        {patients.length === 0 ? (
          <p className="sub">Aún no tienes pacientes asignados.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {patients.map((p) => (
              <li key={p.id} style={{ marginBottom: 10 }}>
                <Link href={`/parent/patients/${p.id}`}>
                  {p.firstName} {p.lastName}
                </Link>
                {p.notes ? <div className="sub">{p.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
