"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";

function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gidi_user");
  return raw ? JSON.parse(raw) : null;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  const roles = useMemo(() => (user?.roles ?? []) as string[], [user]);
  const roleLabel = roles.includes("ADMIN")
    ? "ADMIN"
    : roles.includes("THERAPIST")
      ? "THERAPIST"
      : roles.includes("PARENT")
        ? "PARENT"
        : roles.includes("SCHOOL")
          ? "SCHOOL"
          : "USER";

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    const u = getUser();

    if (!token || !u) {
      router.replace("/");
      return;
    }

    if (u.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }

    setUser(u);
    setReady(true);
  }, [router, pathname]);

  function logout() {
    localStorage.removeItem("gidi_token");
    localStorage.removeItem("gidi_user");
    router.replace("/");
  }

  const nav = roles.includes("ADMIN")
    ? [
        { href: "/admin/patients", label: "Pacientes" },
        { href: "/admin/announcements", label: "Avisos" },
        { href: "/admin/payments", label: "Ingresos" },
      ]
    : roles.includes("THERAPIST")
      ? [
          { href: "/therapist/followups", label: "Seguimientos" },
          { href: "/therapist/patients", label: "Mis pacientes" },
          { href: "/therapist/objective-bank", label: "Banco de objetivos" },
        ]
      : roles.includes("PARENT")
        ? [{ href: "/parent/patients", label: "Mis hijos" }]
        : roles.includes("SCHOOL")
          ? [{ href: "/school/patients", label: "Pacientes" }]
          : [{ href: "/dashboard", label: "Dashboard" }];

  if (!ready)
    return (
      <div className="container py-10">
        <p className="text-subtle">Cargando…</p>
      </div>
    );

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="text-lg font-extrabold tracking-wide text-primary hover:text-primary-hover"
            >
              GiDi
            </Link>
            <span className="rounded-full border border-accent-yellow/35 bg-accent-yellow/15 px-2.5 py-0.5 text-xs font-semibold text-accent-yellow">
              {roleLabel}
            </span>
            <span className="hidden rounded-full border border-border px-2.5 py-0.5 text-xs text-subtle sm:inline">
              {user?.email}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {nav.map((n) => {
              const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    active
                      ? "rounded-full border border-primary/50 bg-primary/15 px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-primary/30"
                      : "rounded-full border border-border px-3 py-1.5 text-sm text-subtle hover:border-accent-blue/40 hover:text-ink"
                  }
                >
                  {n.label}
                </Link>
              );
            })}
            <button
              type="button"
              className="rounded-full border border-accent-red/40 bg-accent-red/10 px-3 py-1.5 text-sm font-medium text-accent-red hover:bg-accent-red/20"
              onClick={logout}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <AnnouncementBanner />

      <div className="container pb-10">{children}</div>
    </>
  );
}
