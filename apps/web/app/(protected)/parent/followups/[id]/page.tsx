"use client";

import { useParams } from "next/navigation";
import { FollowUpDetailEditor } from "@/components/followups/FollowUpDetailEditor";

export default function ParentFollowUpDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <FollowUpDetailEditor
      followUpId={params.id}
      backHref="/parent/patients"
      patientFollowUpsPrefix="/parent"
    />
  );
}
