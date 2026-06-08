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
    parentComments: string | null;
    observationsAuthor: string | null;
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

/** Respuesta de GET /admin/patients/:id/dossier */
export type PatientDossierReport = {
  generatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    notes: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  guardians: {
    parentId: string;
    fullName: string;
    email: string;
    relationship: string;
    isPrimary: boolean;
    notes: string | null;
  }[];
  therapists: {
    therapistId: string;
    fullName: string;
    email: string;
  }[];
  school: {
    schoolId: string;
    fullName: string;
    email: string;
    notes: string | null;
  } | null;
  months: {
    periodYear: number;
    periodMonth: number;
    followUpReports: FollowUpReport[];
  }[];
  totalFollowUps: number;
  totalMonths: number;
};
