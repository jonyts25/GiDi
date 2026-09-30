"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ProgramParentView } from "@/components/followups/ProgramParentView";
import type { ParentProgramSummaryData } from "@/components/followups/ParentFollowUpSummaryCard";

type ProgramSummaryResponse = ParentProgramSummaryData & {
  patient: { id: string; firstName: string; lastName: string };
};

export default function SchoolProgramPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ProgramSummaryResponse | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gidi_token");
    if (!token) return router.replace("/");

    (async () => {
      try {
        const res = (await apiFetch(`/school/programs/${params.id}/summary`)) as ProgramSummaryResponse;
        setData(res);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [params.id, router]);

  if (msg) {
    return (
      <main className="container max-w-[820px] py-10">
        <p className="text-sm text-danger">{msg}</p>
      </main>
    );
  }

  if (!data) {
    return <main className="container max-w-[820px] py-10 text-subtle">Cargando programación…</main>;
  }

  return (
    <ProgramParentView
      data={data}
      backHref={`/school/patients/${data.patient.id}/followups`}
      backLabel="← Volver a seguimientos"
    />
  );
}
