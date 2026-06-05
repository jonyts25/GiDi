import { GuardianRelationship } from "@prisma/client";

export class CreatePatientDto {
  firstName: string;
  lastName: string;
  birthDate?: string;
  notes?: string;
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
}
