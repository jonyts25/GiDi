"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = "parent1@gidi.local";
    const password = "Temp123!";
    const hash = await bcrypt.hash(password, 10);
    const parentRole = await prisma.role.findUnique({ where: { key: client_1.RoleKey.PARENT } });
    if (!parentRole)
        throw new Error("No existe rol PARENT. Asegura seed de roles.");
    const patient = await prisma.patient.findFirst({ orderBy: { createdAt: "asc" } });
    if (!patient)
        throw new Error("No hay pacientes. Crea uno primero.");
    const parent = await prisma.user.upsert({
        where: { email },
        update: { fullName: "Padre Demo", password: hash, status: client_1.UserStatus.ACTIVE },
        create: { email, fullName: "Padre Demo", password: hash, status: client_1.UserStatus.ACTIVE },
        select: { id: true, email: true },
    });
    const alreadyRole = await prisma.userRole.findFirst({
        where: { userId: parent.id, roleId: parentRole.id },
        select: { userId: true },
    });
    if (!alreadyRole) {
        await prisma.userRole.create({
            data: { userId: parent.id, roleId: parentRole.id },
        });
    }
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
//# sourceMappingURL=seed-parent.js.map