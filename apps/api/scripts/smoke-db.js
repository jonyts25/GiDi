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
require("dotenv/config");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("Missing DATABASE_URL");
        process.exit(1);
    }
    const prisma = new client_1.PrismaClient();
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
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((e) => {
    console.error("smoke:db FAILED", e);
    process.exit(1);
});
//# sourceMappingURL=smoke-db.js.map