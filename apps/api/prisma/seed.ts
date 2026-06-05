// @ts-nocheck — Prisma + pnpm: el IDE a veces no resuelve tipos del cliente generado en este script.
/**
 * Seed GiDi — ejecutar con: `pnpm exec prisma db seed` (cwd: apps/api).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, RoleKey, AreaTrackingMode } = require("@prisma/client");
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_ID = "79bb947e-3f62-4472-bf05-cdc640329f67";
const ADMIN_EMAIL = "admin@gidi.local";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Admin123!";

async function wipeAppData() {
  await prisma.$transaction([
    prisma.followUpMark.deleteMany(),
    prisma.followUpSession.deleteMany(),
    prisma.followUpObjective.deleteMany(),
    prisma.followUpAttachment.deleteMany(),
    prisma.followUpMetric.deleteMany(),
    prisma.followUp.deleteMany(),
    prisma.appointmentRequest.deleteMany(),
    prisma.parentPatient.deleteMany(),
    prisma.schoolPatient.deleteMany(),
    prisma.patientTherapist.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.user.deleteMany(),
    prisma.area.deleteMany(),
  ]);
}

async function ensureRoles() {
  const roles: { key: (typeof RoleKey)[keyof typeof RoleKey]; name: string }[] = [
    { key: RoleKey.SUPERADMIN, name: "Super Admin" },
    { key: RoleKey.ADMIN, name: "Administrador" },
    { key: RoleKey.THERAPIST, name: "Terapeuta" },
    { key: RoleKey.PARENT, name: "Padre/Madre" },
    { key: RoleKey.SCHOOL, name: "Escuela" },
    { key: RoleKey.FINANCE, name: "Finanzas" },
    { key: RoleKey.SECRETARY, name: "Secretaría" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name },
      create: { key: r.key, name: r.name },
    });
  }
}

async function seedAreas() {
  const rows = [
    { key: "ADMINISTRATIVO", name: "Administrativo", category: "Gestión", sortOrder: 0, trackingMode: AreaTrackingMode.TEXT_ONLY },
    { key: "FAMILIAR", name: "Familiar", category: "Gestión", sortOrder: 1, trackingMode: AreaTrackingMode.TEXT_ONLY },
    { key: "LECTURA", name: "Lectura", category: "Tratamiento", sortOrder: 10, trackingMode: AreaTrackingMode.MONTHLY_GRID },
    { key: "VISUALES", name: "Visuales", category: "Tratamiento", sortOrder: 11, trackingMode: AreaTrackingMode.MONTHLY_GRID },
    { key: "AUDITIVAS", name: "Auditivas", category: "Tratamiento", sortOrder: 12, trackingMode: AreaTrackingMode.MONTHLY_GRID },
    { key: "PSICOLOGIA", name: "Psicología", category: "Clínica", sortOrder: 20, trackingMode: AreaTrackingMode.MONTHLY_GRID },
    { key: "LENGUAJE", name: "Lenguaje", category: "Clínica", sortOrder: 21, trackingMode: AreaTrackingMode.MONTHLY_GRID },
    { key: "TERAPIA_FISICA", name: "Terapia Física", category: "Clínica", sortOrder: 22, trackingMode: AreaTrackingMode.MONTHLY_GRID },
  ];
  for (const a of rows) {
    await prisma.area.create({
      data: {
        key: a.key,
        name: a.name,
        category: a.category,
        sortOrder: a.sortOrder,
        isActive: true,
        trackingMode: a.trackingMode,
      },
    });
  }
}

function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("GiDi seed: limpiando datos de aplicación…");
  await wipeAppData();

  console.log("GiDi seed: roles y áreas…");
  await ensureRoles();
  await seedAreas();

  const roleAdmin = await prisma.role.findUniqueOrThrow({ where: { key: RoleKey.ADMIN } });
  const roleTherapist = await prisma.role.findUniqueOrThrow({ where: { key: RoleKey.THERAPIST } });

  console.log("GiDi seed: usuario administrador (UUID fijo)…");
  await prisma.user.create({
    data: {
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      fullName: "Administrador GiDi",
      password: passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: { create: [{ roleId: roleAdmin.id }] },
    },
  });

  console.log("GiDi seed: terapeutas (THERAPIST)…");
  const therapist1 = await prisma.user.create({
    data: {
      email: "maria.gonzalez@gidi.local",
      fullName: "María González Ruiz",
      password: passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: { create: [{ roleId: roleTherapist.id }] },
    },
  });

  const therapist2 = await prisma.user.create({
    data: {
      email: "carlos.hernandez@gidi.local",
      fullName: "Carlos Hernández López",
      password: passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      roles: { create: [{ roleId: roleTherapist.id }] },
    },
  });

  console.log("GiDi seed: pacientes de prueba…");
  const patientsData = [
    {
      firstName: "Sofía",
      lastName: "Ramírez Vega",
      birthDate: new Date("2018-03-12"),
      notes: "Demo: regulación emocional y comunicación funcional.",
    },
    {
      firstName: "Lucas",
      lastName: "Martínez Ortega",
      birthDate: new Date("2016-07-22"),
      notes: "Demo: organización de tareas y control de impulsos.",
    },
  ];

  const patients = await Promise.all(
    patientsData.map((p) =>
      prisma.patient.create({
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          birthDate: p.birthDate,
          notes: p.notes,
        },
      }),
    ),
  );

  const [p0] = patients;

  await prisma.patientTherapist.create({
    data: { patientId: p0.id, therapistId: therapist1.id },
  });

  const areaLectura = await prisma.area.findUniqueOrThrow({ where: { key: "LECTURA" } });
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  console.log("GiDi seed: seguimiento mensual demo con sesiones…");
  const followUp = await prisma.followUp.create({
    data: {
      patientId: p0.id,
      therapistId: therapist1.id,
      areaId: areaLectura.id,
      periodYear: year,
      periodMonth: month,
      status: "ACTIVE",
      objectives: {
        create: [
          { idx: 1, text: "Reconocer fonemas iniciales en palabras cortas" },
          { idx: 2, text: "Leer oraciones de 5 palabras con apoyo visual" },
        ],
      },
    },
    include: { objectives: true },
  });

  const sessionDates = [5, 12, 19].map((day) => utcDate(year, month, day));
  for (const sessionDate of sessionDates) {
    const session = await prisma.followUpSession.create({
      data: {
        followUpId: followUp.id,
        therapistId: therapist1.id,
        sessionDate,
      },
    });
    await prisma.followUpMark.create({
      data: {
        followUpSessionId: session.id,
        objectiveId: followUp.objectives[0].id,
        progressScale: 2,
      },
    });
  }

  console.log("GiDi seed: listo.");
  console.log(`  Admin:    ${ADMIN_EMAIL}  /  ${DEMO_PASSWORD}`);
  console.log(`  Terap.1:  maria.gonzalez@gidi.local  /  ${DEMO_PASSWORD}`);
  console.log(`  Terap.2:  carlos.hernandez@gidi.local  /  ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
