import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { App } from "supertest/types";
import { RoleKey } from "@prisma/client";
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

async function ensureUser(
  prisma: PrismaService,
  email: string,
  roleKeys: RoleKey[],
) {
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

(runE2e ? describe : describe.skip)("Admin users API access (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let targetUserId: string;
  let adminId: string;
  let secretaryId: string;
  let parentId: string;
  let therapistId: string;
  let schoolId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const admin = await ensureUser(prisma, "e2e-admin-users-admin@gidi.test", [RoleKey.ADMIN]);
    const secretary = await ensureUser(prisma, "e2e-admin-users-sec@gidi.test", [RoleKey.SECRETARY]);
    const parent = await ensureUser(prisma, "e2e-admin-users-parent@gidi.test", [RoleKey.PARENT]);
    const therapist = await ensureUser(prisma, "e2e-admin-users-therapist@gidi.test", [RoleKey.THERAPIST]);
    const school = await ensureUser(prisma, "e2e-admin-users-school@gidi.test", [RoleKey.SCHOOL]);
    const target = await ensureUser(prisma, "e2e-admin-users-target@gidi.test", [RoleKey.PARENT]);

    adminId = admin.id;
    secretaryId = secretary.id;
    parentId = parent.id;
    therapistId = therapist.id;
    schoolId = school.id;
    targetUserId = target.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  const createBody = {
    email: `e2e-new-${Date.now()}@gidi.test`,
    fullName: "Nuevo E2E",
    role: RoleKey.PARENT,
    password: "temp-pass-12",
  };

  it.each([
    ["PARENT", () => parentId, "e2e-admin-users-parent@gidi.test"],
    ["THERAPIST", () => therapistId, "e2e-admin-users-therapist@gidi.test"],
    ["SCHOOL", () => schoolId, "e2e-admin-users-school@gidi.test"],
  ] as const)("$1 recibe 403 en POST/GET/PATCH admin/users", async (_label, idFn, email) => {
    const header = authHeader(idFn(), email);
    await request(app.getHttpServer())
      .post("/admin/users")
      .set("Authorization", header)
      .send(createBody)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/admin/users/${targetUserId}`)
      .set("Authorization", header)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}`)
      .set("Authorization", header)
      .send({ fullName: "X" })
      .expect(403);
  });

  it("SECRETARY no puede crear un ADMIN", async () => {
    await request(app.getHttpServer())
      .post("/admin/users")
      .set("Authorization", authHeader(secretaryId, "e2e-admin-users-sec@gidi.test"))
      .send({
        ...createBody,
        email: `e2e-admin-deny-${Date.now()}@gidi.test`,
        role: RoleKey.ADMIN,
      })
      .expect(403);
  });

  it("ADMIN puede cambiar roles vía PATCH", async () => {
    const header = authHeader(adminId, "e2e-admin-users-admin@gidi.test");
    await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}`)
      .set("Authorization", header)
      .send({ roles: [RoleKey.PARENT, RoleKey.SCHOOL] })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/admin/users/${targetUserId}`)
      .set("Authorization", header)
      .expect(200);

    const keys = (detail.body.roles ?? []).map((r: { role: { key: string } }) => r.role.key);
    expect(keys).toEqual(expect.arrayContaining([RoleKey.PARENT, RoleKey.SCHOOL]));
  });
});
