import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { App } from "supertest/types";
import { RoleKey, UserStatus } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma.service";

const runE2e = Boolean(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT_SECRET?.trim() || "dev-secret";

async function ensureRole(prisma: PrismaService, key: RoleKey, name: string) {
  return prisma.role.upsert({
    where: { key },
    create: { key, name },
    update: {},
  });
}

async function ensureUser(prisma: PrismaService, email: string, roleKeys: RoleKey[]) {
  const passwordHash = await bcrypt.hash("e2e-pass", 6);
  const roles = await Promise.all(roleKeys.map((key) => ensureRole(prisma, key, key)));
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      fullName: email.split("@")[0],
      password: passwordHash,
      roles: { create: roles.map((r) => ({ roleId: r.id })) },
    },
    update: {},
    select: { id: true, email: true },
  });
}

function authHeader(userId: string, email: string) {
  const token = jwt.sign({ sub: userId, email, roles: [] }, JWT_SECRET, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

(runE2e ? describe : describe.skip)("Patients API access (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentId: string;
  let schoolId: string;
  let therapistAssignedId: string;
  let therapistOtherId: string;
  let assignedPatientId: string;
  let unassignedPatientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const parent = await ensureUser(prisma, "e2e-patients-parent@gidi.test", [RoleKey.PARENT]);
    const school = await ensureUser(prisma, "e2e-patients-school@gidi.test", [RoleKey.SCHOOL]);
    const therapistAssigned = await ensureUser(prisma, "e2e-patients-ther-a@gidi.test", [
      RoleKey.THERAPIST,
    ]);
    const therapistOther = await ensureUser(prisma, "e2e-patients-ther-b@gidi.test", [
      RoleKey.THERAPIST,
    ]);

    parentId = parent.id;
    schoolId = school.id;
    therapistAssignedId = therapistAssigned.id;
    therapistOtherId = therapistOther.id;

    const assigned = await prisma.patient.upsert({
      where: { id: "22222222-2222-4222-8222-222222222222" },
      create: {
        id: "22222222-2222-4222-8222-222222222222",
        firstName: "Asignado",
        lastName: "E2E",
        status: UserStatus.ACTIVE,
        assignments: { create: { therapistId: therapistAssignedId } },
      },
      update: {},
      select: { id: true },
    });

    const unassigned = await prisma.patient.upsert({
      where: { id: "33333333-3333-4333-8333-333333333333" },
      create: {
        id: "33333333-3333-4333-8333-333333333333",
        firstName: "Otro",
        lastName: "E2E",
        status: UserStatus.ACTIVE,
        assignments: { create: { therapistId: therapistOtherId } },
      },
      update: {},
      select: { id: true },
    });

    assignedPatientId = assigned.id;
    unassignedPatientId = unassigned.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  const createPayload = {
    firstName: "Nuevo",
    lastName: "Paciente",
    therapistIds: [] as string[],
  };

  it.each([
    ["PARENT", () => parentId, "e2e-patients-parent@gidi.test"],
    ["SCHOOL", () => schoolId, "e2e-patients-school@gidi.test"],
  ] as const)("$1 recibe 403 en GET/POST /patients y GET /patients/:id", async (_label, idFn, email) => {
    const header = authHeader(idFn(), email);
    await request(app.getHttpServer()).get("/patients").set("Authorization", header).expect(403);
    await request(app.getHttpServer())
      .get(`/patients/${assignedPatientId}`)
      .set("Authorization", header)
      .expect(403);
    await request(app.getHttpServer())
      .post("/patients")
      .set("Authorization", header)
      .send(createPayload)
      .expect(403);
  });

  it("THERAPIST recibe 403 en GET /patients/:id de paciente no asignado", async () => {
    await request(app.getHttpServer())
      .get(`/patients/${unassignedPatientId}`)
      .set("Authorization", authHeader(therapistAssignedId, "e2e-patients-ther-a@gidi.test"))
      .expect(403);
  });

  it("THERAPIST puede GET /patients/:id de paciente asignado", async () => {
    await request(app.getHttpServer())
      .get(`/patients/${assignedPatientId}`)
      .set("Authorization", authHeader(therapistAssignedId, "e2e-patients-ther-a@gidi.test"))
      .expect(200);
  });
});
