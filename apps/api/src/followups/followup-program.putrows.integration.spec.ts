import { execSync } from "child_process";
import path from "path";
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, INestApplication } from "@nestjs/common";
import { AreaTrackingMode } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma.service";
import { FollowUpProgramService } from "./followup-program.service";
import { AuthUser } from "../auth/auth-user";

const runIntegration = Boolean(process.env.DATABASE_URL);
const SCOTIABANK_BACKFILL = "20260930150100_scotiabank_income_method_backfill";

function prepareLocalDatabaseSchema() {
  if (!process.env.DATABASE_URL?.includes("127.0.0.1")) return;
  const cwd = path.join(__dirname, "../..");
  try {
    execSync("npx prisma migrate deploy", { cwd, env: process.env, stdio: "pipe" });
  } catch {
    execSync(`npx prisma migrate resolve --applied ${SCOTIABANK_BACKFILL}`, {
      cwd,
      env: process.env,
      stdio: "pipe",
    });
    execSync("npx prisma migrate deploy", { cwd, env: process.env, stdio: "pipe" });
  }
}

async function ensureIntegrationFixtures(prisma: PrismaService) {
  const superRole = await prisma.role.upsert({
    where: { key: "SUPERADMIN" },
    create: { key: "SUPERADMIN", name: "Super Admin" },
    update: {},
  });
  const therapistRole = await prisma.role.upsert({
    where: { key: "THERAPIST" },
    create: { key: "THERAPIST", name: "Terapeuta" },
    update: {},
  });

  const passwordHash = await bcrypt.hash("test-pass", 6);
  const admin = await prisma.user.upsert({
    where: { email: "putrows-integration-admin@gidi.test" },
    create: {
      email: "putrows-integration-admin@gidi.test",
      fullName: "Admin Integración",
      password: passwordHash,
      roles: { create: { roleId: superRole.id } },
    },
    update: {},
    select: { id: true },
  });

  const therapist = await prisma.user.upsert({
    where: { email: "putrows-integration-therapist@gidi.test" },
    create: {
      email: "putrows-integration-therapist@gidi.test",
      fullName: "Terapeuta Integración",
      password: passwordHash,
      roles: { create: { roleId: therapistRole.id } },
    },
    update: {},
    select: { id: true },
  });

  const area = await prisma.area.upsert({
    where: { key: "LECTURA" },
    create: {
      key: "LECTURA",
      name: "Lectura",
      category: "Tratamiento",
      sortOrder: 10,
      trackingMode: AreaTrackingMode.MONTHLY_GRID,
    },
    update: {},
  });

  const patient = await prisma.patient.upsert({
    where: { id: "11111111-1111-4111-8111-111111111111" },
    create: {
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Paciente",
      lastName: "Integración",
      status: "ACTIVE",
    },
    update: {},
  });

  await prisma.patientTherapist.upsert({
    where: {
      patientId_therapistId: { patientId: patient.id, therapistId: therapist.id },
    },
    create: { patientId: patient.id, therapistId: therapist.id },
    update: {},
  });

  return { admin, therapist, area, patient };
}

async function deleteProgramAndFollowUps(prisma: PrismaService, programId: string) {
  await prisma.followUp.deleteMany({ where: { programId } });
  await prisma.followUpProgram.delete({ where: { id: programId } });
}

/** Borra programas y seguimientos (incl. huérfanos con programId null) de un mes. */
async function clearPatientTherapistMonth(
  prisma: PrismaService,
  patientId: string,
  therapistId: string,
  periodYear: number,
  periodMonth: number,
) {
  const programs = await prisma.followUpProgram.findMany({
    where: { patientId, therapistId, periodYear, periodMonth },
    select: { id: true },
  });
  const programIds = programs.map((p) => p.id);
  if (programIds.length > 0) {
    await prisma.followUp.deleteMany({ where: { programId: { in: programIds } } });
    await prisma.followUpProgram.deleteMany({ where: { id: { in: programIds } } });
  }
  await prisma.followUp.deleteMany({
    where: { patientId, therapistId, periodYear, periodMonth },
  });
}

(runIntegration ? describe : describe.skip)(
  "FollowUpProgram putRows integration (DATABASE_URL)",
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let programService: FollowUpProgramService;
    let adminUser: AuthUser;

    beforeAll(async () => {
      prepareLocalDatabaseSchema();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
      prisma = app.get(PrismaService);
      programService = app.get(FollowUpProgramService);

      const fixtures = await ensureIntegrationFixtures(prisma);
      adminUser = { sub: fixtures.admin.id, roles: ["SUPERADMIN"] };
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    async function createIsolatedProgram() {
      const fixtures = await ensureIntegrationFixtures(prisma);
      const stamp = Date.now();
      const program = await programService.createOrGet(adminUser, {
        patientId: fixtures.patient.id,
        therapistId: fixtures.therapist.id,
        periodYear: 2099,
        periodMonth: ((stamp % 12) + 1) as number,
      });

      return { program, area: fixtures.area };
    }

    it("putRows con área nueva guarda objetivos (misma transacción)", async () => {
      const { program, area } = await createIsolatedProgram();

      const payload = await programService.putRows(adminUser, program.id, [
        {
          areaId: area.id,
          objectives: [{ text: `Obj integración ${Date.now()}` }],
        },
      ]);

      expect(payload.areas.some((a) => a.areaId === area.id)).toBe(true);
      const saved = payload.areas.find((a) => a.areaId === area.id);
      expect(saved?.objectives.length).toBe(1);

      const count = await prisma.followUp.count({
        where: { programId: program.id, areaId: area.id },
      });
      expect(count).toBe(1);

      await deleteProgramAndFollowUps(prisma, program.id);
    });

    it("rechaza payload con areaId duplicado", async () => {
      const { program, area } = await createIsolatedProgram();

      await expect(
        programService.putRows(adminUser, program.id, [
          { areaId: area.id, objectives: [{ text: "A" }] },
          { areaId: area.id, objectives: [{ text: "B" }] },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);

      await deleteProgramAndFollowUps(prisma, program.id);
    });

    it("copy-from-previous copia filas sin error de transacción", async () => {
      const fixtures = await ensureIntegrationFixtures(prisma);
      const periodYear = 2070 + (Date.now() % 20);
      const prevMonth = 3;
      const nextMonth = 4;

      await clearPatientTherapistMonth(
        prisma,
        fixtures.patient.id,
        fixtures.therapist.id,
        periodYear,
        prevMonth,
      );
      await clearPatientTherapistMonth(
        prisma,
        fixtures.patient.id,
        fixtures.therapist.id,
        periodYear,
        nextMonth,
      );

      const prev = await programService.createOrGet(adminUser, {
        patientId: fixtures.patient.id,
        therapistId: fixtures.therapist.id,
        periodYear,
        periodMonth: prevMonth,
      });
      await programService.putRows(adminUser, prev.id, [
        { areaId: fixtures.area.id, objectives: [{ text: "Mes anterior" }] },
      ]);

      const next = await programService.createOrGet(adminUser, {
        patientId: fixtures.patient.id,
        therapistId: fixtures.therapist.id,
        periodYear,
        periodMonth: nextMonth,
      });

      const copied = await programService.copyFromPrevious(adminUser, next.id);
      expect(copied.areas.some((a) => a.areaId === fixtures.area.id)).toBe(true);
      expect(
        copied.areas.find((a) => a.areaId === fixtures.area.id)?.objectives[0]?.text,
      ).toBe("Mes anterior");

      await deleteProgramAndFollowUps(prisma, prev.id);
      await deleteProgramAndFollowUps(prisma, next.id);
    });

    it("dos putRows concurrentes dejan un solo FollowUp por área", async () => {
      const { program, area } = await createIsolatedProgram();
      const rows = [{ areaId: area.id, objectives: [{ text: "Concurrente" }] }];

      await Promise.all([
        programService.putRows(adminUser, program.id, rows),
        programService.putRows(adminUser, program.id, rows),
      ]);

      const count = await prisma.followUp.count({
        where: { programId: program.id, areaId: area.id },
      });
      expect(count).toBe(1);

      const refreshed = await programService.get(adminUser, program.id);
      expect(refreshed.areas.find((a) => a.areaId === area.id)?.objectives[0]?.text).toBe(
        "Concurrente",
      );

      await deleteProgramAndFollowUps(prisma, program.id);
    });
  },
);
