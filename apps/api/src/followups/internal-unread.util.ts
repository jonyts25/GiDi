import { AuthUser } from "../auth/auth-user";

/** Alcance de pacientes para avisos de comunicación interna; null = sin acceso. */
export function internalUnreadPatientScope(user: AuthUser): "all_active" | "therapist_assigned" | null {
  if (user.roles.some((r) => r === "ADMIN" || r === "SECRETARY" || r === "SUPERADMIN")) {
    return "all_active";
  }
  if (user.roles.includes("THERAPIST")) {
    return "therapist_assigned";
  }
  return null;
}

/** Sin registro de lectura o la nota se editó después de seenAt. */
export function isInternalFollowUpUnread(
  generalNotes: string | null | undefined,
  lastNoteAt: Date | null | undefined,
  seenAt: Date | null | undefined,
): boolean {
  if (!lastNoteAt) return false;
  if (!generalNotes?.trim()) return false;
  if (!seenAt) return true;
  return seenAt.getTime() < lastNoteAt.getTime();
}

export function internalNoteTextChanged(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  return (previous ?? "").trim() !== (next ?? "").trim();
}
