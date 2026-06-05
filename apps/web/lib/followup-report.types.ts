/** Respuesta de GET /followups/:id/report */
export type FollowUpReport = {
  generatedAt: string;
  followUp: {
    id: string;
    status: string;
    periodYear: number;
    periodMonth: number;
    generalGoal: string | null;
    generalNotes: string | null;
    homeWork: string | null;
    patient: { id: string; firstName: string; lastName: string };
    therapist: { id: string; fullName: string; email?: string };
    area: { id: string; key: string; name: string; category?: string | null; trackingMode?: string };
  };
  summary: {
    attendance: {
      percent: number | null;
      present: number;
      absent: number;
      excluded: number;
      unknown: number;
      totalCounted: number;
    };
    objectiveProgress: {
      objectiveId: string;
      idx: number;
      text: string;
      monthlyNotes: string | null;
      lastProgressScale: number | null;
      lastProgressPercent: number | null;
      lastSessionDate: string | null;
    }[];
    sessionCount: number;
    objectiveCount: number;
  };
  objectives: {
    id: string;
    idx: number;
    text: string;
    monthlyNotes: string | null;
  }[];
  sessions: {
    id: string;
    sessionDate: string;
    therapist: { id: string; fullName: string };
    attendance: string;
    marks: {
      id: string;
      objectiveId: string;
      objectiveIdx: number | null;
      objectiveText: string | null;
      code: string | null;
      progressScale: number | null;
      progressPercent: number | null;
      note: string | null;
    }[];
  }[];
};
