import { ForbiddenException } from "@nestjs/common";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const PATIENT_ID = "patient-1";

function prismaMock(opts: {
  parentLink?: boolean;
  therapistAssignment?: boolean;
  patientActive?: boolean;
  coordinatorLink?: boolean;
}): PrismaService {
  return {
    patient: {
      findUnique: jest.fn().mockResolvedValue(
        opts.patientActive === false ? null : { status: "ACTIVE" },
      ),
    },
    parentPatient: {
      findFirst: jest.fn().mockResolvedValue(opts.parentLink ? { patientId: PATIENT_ID } : null),
    },
    patientTherapist: {
      findFirst: jest.fn().mockImplementation(async (args: { where: Record<string, unknown> }) => {
        if ("therapist" in args.where) {
          return opts.coordinatorLink ? { patientId: PATIENT_ID } : null;
        }
        if ("therapistId" in args.where) {
          return opts.therapistAssignment ? { patientId: PATIENT_ID } : null;
        }
        return null;
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ coordinatorId: "coord-1" }),
    },
  } as unknown as PrismaService;
}

describe("FollowUpAccessService assertCanUploadPatientDocuments", () => {
  it("coordinadora con vista al paciente no puede subir documentos", async () => {
    const svc = new FollowUpAccessService(
      prismaMock({ coordinatorLink: true, therapistAssignment: false }),
    );
    const user: AuthUser = { sub: "coord-1", roles: ["COORDINATOR"] };

    await expect(svc.assertCanUploadPatientDocuments(user, PATIENT_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("terapeuta asignada puede subir documentos", async () => {
    const svc = new FollowUpAccessService(
      prismaMock({ therapistAssignment: true }),
    );
    const user: AuthUser = { sub: "therapist-1", roles: ["THERAPIST"] };

    await expect(svc.assertCanUploadPatientDocuments(user, PATIENT_ID)).resolves.toBeUndefined();
  });

  it("padre vinculado puede subir documentos", async () => {
    const svc = new FollowUpAccessService(prismaMock({ parentLink: true }));
    const user: AuthUser = { sub: "parent-1", roles: ["PARENT"] };

    await expect(svc.assertCanUploadPatientDocuments(user, PATIENT_ID)).resolves.toBeUndefined();
  });
});
