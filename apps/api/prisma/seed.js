"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
const ADMIN_ID = "79bb947e-3f62-4472-bf05-cdc640329f67";
const ADMIN_EMAIL = "admin@gidi.local";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Admin123!";
const STATUS_SCHEDULED = "SCHEDULED";
faker_1.faker.seed(42_001);
async function wipeAppData() {
    await prisma.$transaction([
        prisma.followUpMark.deleteMany(),
        prisma.followUpEntry.deleteMany(),
        prisma.followUpObjective.deleteMany(),
        prisma.followUpAttachment.deleteMany(),
        prisma.followUpMetric.deleteMany(),
        prisma.followUp.deleteMany(),
        prisma.session.deleteMany(),
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
    const roles = [
        { key: client_1.RoleKey.SUPERADMIN, name: "Super Admin" },
        { key: client_1.RoleKey.ADMIN, name: "Administrador" },
        { key: client_1.RoleKey.THERAPIST, name: "Terapeuta" },
        { key: client_1.RoleKey.PARENT, name: "Padre/Madre" },
        { key: client_1.RoleKey.SCHOOL, name: "Escuela" },
        { key: client_1.RoleKey.FINANCE, name: "Finanzas" },
        { key: client_1.RoleKey.SECRETARY, name: "Secretaría" },
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
        { key: "PSICOLOGIA", name: "Psicología", category: "Clínica", sortOrder: 1 },
        { key: "LENGUAJE", name: "Lenguaje", category: "Clínica", sortOrder: 2 },
        { key: "TERAPIA_FISICA", name: "Terapia Física", category: "Clínica", sortOrder: 3 },
    ];
    for (const a of rows) {
        await prisma.area.create({
            data: {
                key: a.key,
                name: a.name,
                category: a.category,
                sortOrder: a.sortOrder,
                isActive: true,
            },
        });
    }
}
function atDaysOffset(base, dayDelta, hour = 10, minute = 0) {
    const d = new Date(base);
    d.setDate(d.getDate() + dayDelta);
    d.setHours(hour, minute, 0, 0);
    return d;
}
async function ensureSessionStatusScheduled() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TYPE "SessionStatus" ADD VALUE 'SCHEDULED'`);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/duplicate|already exists|42710/i.test(msg))
            return;
        throw e;
    }
}
async function main() {
    console.log("GiDi seed: limpiando datos de aplicación…");
    await wipeAppData();
    console.log("GiDi seed: roles y áreas…");
    await ensureRoles();
    await seedAreas();
    const roleAdmin = await prisma.role.findUniqueOrThrow({ where: { key: client_1.RoleKey.ADMIN } });
    const roleTherapist = await prisma.role.findUniqueOrThrow({ where: { key: client_1.RoleKey.THERAPIST } });
    console.log("GiDi seed: usuario administrador (UUID fijo)…");
    await prisma.user.create({
        data: {
            id: ADMIN_ID,
            email: ADMIN_EMAIL,
            fullName: "Administrador GiDi",
            password: DEMO_PASSWORD,
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
            password: DEMO_PASSWORD,
            status: "ACTIVE",
            mustChangePassword: false,
            roles: { create: [{ roleId: roleTherapist.id }] },
        },
    });
    const therapist2 = await prisma.user.create({
        data: {
            email: "carlos.hernandez@gidi.local",
            fullName: "Carlos Hernández López",
            password: DEMO_PASSWORD,
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
            notes: "Diagnóstico (ficticio): TEA nivel 1 de apoyo. Objetivos: regulación emocional básica y comunicación funcional.",
        },
        {
            firstName: "Lucas",
            lastName: "Martínez Ortega",
            birthDate: new Date("2016-07-22"),
            notes: "Diagnóstico (ficticio): TDAH presentación combinada. Objetivos: organización de tareas y control de impulsos en aula.",
        },
        {
            firstName: "Valentina",
            lastName: "Torres Mena",
            birthDate: new Date("2019-11-05"),
            notes: "Diagnóstico (ficticio): Trastorno específico del lenguaje (TEL). Objetivos: expansión léxica y estructuración de oraciones.",
        },
        {
            firstName: "Mateo",
            lastName: "Jiménez Salas",
            birthDate: new Date("2017-01-30"),
            notes: "Diagnóstico (ficticio): Dispraxia. Objetivos: coordinación visomotora y planificación motora fina.",
        },
        {
            firstName: "Emma",
            lastName: "Castro Pineda",
            birthDate: new Date("2015-09-14"),
            notes: "Diagnóstico (ficticio): Ansiedad por separación. Objetivos: gradualidad en transiciones escuela-hogar.",
        },
    ];
    const patients = await Promise.all(patientsData.map((p) => prisma.patient.create({
        data: {
            firstName: p.firstName,
            lastName: p.lastName,
            birthDate: p.birthDate,
            notes: p.notes,
        },
    })));
    console.log("GiDi seed: asignaciones paciente–terapeuta…");
    const [p0, p1, p2, p3, p4] = patients;
    await prisma.patientTherapist.createMany({
        data: [
            { patientId: p0.id, therapistId: therapist1.id },
            { patientId: p1.id, therapistId: therapist1.id },
            { patientId: p2.id, therapistId: therapist1.id },
            { patientId: p2.id, therapistId: therapist2.id },
            { patientId: p3.id, therapistId: therapist2.id },
            { patientId: p4.id, therapistId: therapist2.id },
        ],
    });
    const today = new Date();
    console.log("GiDi seed: sesiones (5 completadas + 5 programadas)…");
    await ensureSessionStatusScheduled();
    const completedSpecs = [
        { patientId: p0.id, therapistId: therapist1.id, daysAgo: 35, hour: 9 },
        { patientId: p1.id, therapistId: therapist1.id, daysAgo: 28, hour: 11 },
        { patientId: p2.id, therapistId: therapist1.id, daysAgo: 21, hour: 10 },
        { patientId: p3.id, therapistId: therapist2.id, daysAgo: 14, hour: 15 },
        { patientId: p4.id, therapistId: therapist2.id, daysAgo: 7, hour: 16 },
    ];
    for (const spec of completedSpecs) {
        const startedAt = atDaysOffset(today, -spec.daysAgo, spec.hour, 0);
        const endedAt = new Date(startedAt);
        endedAt.setMinutes(endedAt.getMinutes() + 50);
        await prisma.session.create({
            data: {
                patientId: spec.patientId,
                therapistId: spec.therapistId,
                startedAt,
                endedAt,
                durationMinutes: 50,
                status: client_1.SessionStatus.COMPLETED,
                notes: `Sesión completada. ${faker_1.faker.lorem.sentence()}`,
                capturedAt: startedAt,
                confirmedAt: endedAt,
                validatedAt: endedAt,
                confirmedById: spec.therapistId,
                validatedById: ADMIN_ID,
            },
        });
    }
    const scheduledSpecs = [
        { patientId: p0.id, therapistId: therapist1.id, daysAhead: 3, hour: 9 },
        { patientId: p1.id, therapistId: therapist1.id, daysAhead: 5, hour: 11 },
        { patientId: p2.id, therapistId: therapist2.id, daysAhead: 7, hour: 10 },
        { patientId: p3.id, therapistId: therapist2.id, daysAhead: 10, hour: 14 },
        { patientId: p4.id, therapistId: therapist2.id, daysAhead: 14, hour: 8 },
    ];
    for (const spec of scheduledSpecs) {
        const startedAt = atDaysOffset(today, spec.daysAhead, spec.hour, 30);
        await prisma.session.create({
            data: {
                patientId: spec.patientId,
                therapistId: spec.therapistId,
                startedAt,
                endedAt: null,
                durationMinutes: null,
                status: STATUS_SCHEDULED,
                notes: `Sesión programada. ${faker_1.faker.lorem.sentence()}`,
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
//# sourceMappingURL=seed.js.map