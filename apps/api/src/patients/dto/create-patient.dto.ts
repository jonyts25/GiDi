import { GidiCenter, GuardianRelationship } from "@prisma/client";

export class CreatePatientDto {
  firstName: string;
  lastName: string;
  birthDate?: string;
  notes?: string;
  center?: GidiCenter;
  sessionsPerWeek?: number;
  discountPercent?: number;
  therapistIds?: string[];

  parent?: {
    email: string;
    fullName: string;
    relationship?: GuardianRelationship; // MOTHER/FATHER/TUTOR/OTHER
    isPrimary?: boolean;
    notes?: string;
  };

  /** Varios tutores: `existingParentId` o pareja `email`+`fullName` por elemento. Si se omite, se usa `parent` (compat). */
  guardians?: Array<{
    existingParentId?: string;
    email?: string;
    fullName?: string;
    relationship?: GuardianRelationship;
    isPrimary?: boolean;
    notes?: string | null;
  }>;

  /** Escuela ya registrada. */
  schoolId?: string;

  /** Alta inline de escuela si no hay schoolId. */
  school?: {
    email?: string;
    fullName?: string;
    notes?: string | null;
  };
}
