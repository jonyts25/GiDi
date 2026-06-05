/**
 * Prueba de humo: lectura + alta/baja de User (UUID) contra Postgres (Supabase).
 * Uso: pnpm run smoke:db
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.user.findMany({ take: 3, select: { id: true, email: true } });
    console.log(`smoke:db OK — User.findMany returned ${rows.length} row(s)`);
    if (rows.length) {
      console.log("sample:", rows[0]);
    }

    const stamp = Date.now();
    const email = `smoke+${stamp}@gidi-smoke.invalid`;
    const passwordHash = await bcrypt.hash(`smoke-pass-${stamp}`, 6);
    const created = await prisma.user.create({
      data: {
        email,
        fullName: "Smoke GiDi",
        password: passwordHash,
        status: "ACTIVE",
      },
      select: { id: true, email: true },
    });
    console.log("smoke:db OK — User.create id (uuid):", created.id);

    await prisma.user.delete({ where: { id: created.id } });
    console.log("smoke:db OK — User.delete completed");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("smoke:db FAILED", e);
  process.exit(1);
});
