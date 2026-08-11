"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  canViewRevenueOverview,
  hasFullAdminRole,
  hasOfficeStaffRole,
  hasParentPortalAccess,
  primaryRoleLabel,
} from "@/lib/role-permissions";
import { readStoredUser } from "@/lib/stored-user";

export default function Dashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const user = readStoredUser();
    if (!token || !user) {
      router.replace("/");
      return;
    }

    const userRoles = user.roles ?? [];
    setRoles(userRoles);
    setReady(true);

    if (hasOfficeStaffRole(userRoles)) return;
    if (userRoles.includes("THERAPIST")) {
      router.replace("/therapist/patients");
      return;
    }
    if (hasParentPortalAccess(userRoles)) {
      router.replace("/parent/patients");
      return;
    }
    if (userRoles.includes("SCHOOL")) {
      router.replace("/school/patients");
      return;
    }
  }, [router]);

  if (!ready) return <p style={{ padding: 20 }}>Cargando...</p>;

  if (hasOfficeStaffRole(roles)) {
    return (
      <main style={{ padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>Dashboard {primaryRoleLabel(roles)}</h1>
        <p style={{ opacity: 0.8 }}>Elige un módulo:</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="btn" href="/admin/patients">
            Lista de pacientes
          </Link>
          <Link className="btn" href="/admin/therapists">
            Terapeutas
          </Link>
          <Link className="btn" href="/admin/parents">
            Padres
          </Link>
          <Link className="btn" href="/admin/schools">
            Escuelas
          </Link>
          <Link className="btn" href="/admin/users">
            Usuarios
          </Link>
          <Link className="btn" href="/admin/announcements">
            Avisos
          </Link>
          {canViewRevenueOverview(roles) ? (
            <Link className="btn" href="/admin/payments">
              Ingresos
            </Link>
          ) : null}
          {hasFullAdminRole(roles) ? (
            <Link className="btn" href="/admin/branding">
              Logo
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  if (roles.includes("FINANCE")) {
    return (
      <main style={{ padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>Dashboard Finanzas</h1>
        <p style={{ opacity: 0.8 }}>Su perfil está activo. Contacte al administrador si necesita acceso a módulos adicionales.</p>
      </main>
    );
  }

  return <p style={{ padding: 20 }}>Redirigiendo…</p>;
}
