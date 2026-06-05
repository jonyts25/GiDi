import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "therapist1@gidi.local";
  const pass = "Therapist123!";
  const hashed = await bcrypt.hash(pass, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: "Terapeuta 1",
      password: hashed,
      roles: { create: [{ role: { connect: { key: "THERAPIST" } } }] },
    },
  });

  console.log("Therapist:", email, pass, "id:", user.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
