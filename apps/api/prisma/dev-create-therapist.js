"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = "therapist1@gidi.local";
    const pass = "Therapist123!";
    const hashed = await bcrypt_1.default.hash(pass, 10);
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
//# sourceMappingURL=dev-create-therapist.js.map