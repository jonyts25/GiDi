import { PrismaClient, RoleKey, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "parent1@gidi.local";
  const password = "Temp123!";
  const hash = await bcrypt.hash(password, 10);

  const parentRole = await prisma.role.findUnique({ where: { key: RoleKey.PARENT } });
  if (!parentRole) throw new Error("No existe rol PARENT. Asegura seed de roles.");

  const patient = await prisma.patient.findFirst({ orderBy: { createdAt: "asc" } });
  if (!patient) throw new Error("No hay pacientes. Crea uno primero.");

  // upsert user por email
  const parent = await prisma.user.upsert({
    where: { email },
    update: { fullName: "Padre Demo", password: hash, status: UserStatus.ACTIVE },
    create: { email, fullName: "Padre Demo", password: hash, status: UserStatus.ACTIVE },
    select: { id: true, email: true },
  });

  // asegurar rol PARENT
  const alreadyRole = await prisma.userRole.findFirst({
    where: { userId: parent.id, roleId: parentRole.id },
    select: { userId: true },
  });

  if (!alreadyRole) {
    await prisma.userRole.create({
      data: { userId: parent.id, roleId: parentRole.id },
    });
  }

  // asegurar join ParentPatient SIN depender de nombre de constraint
  const existingJoin = await prisma.parentPatient.findFirst({
    where: { parentId: parent.id, patientId: patient.id },
    select: { id: true },
  });

  if (!existingJoin) {
    await prisma.parentPatient.create({
      data: { parentId: parent.id, patientId: patient.id },
    });
  }

  console.log("✅ Parent demo:", { email, password, patientId: patient.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
