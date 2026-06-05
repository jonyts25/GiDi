import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaService } from "../prisma.service";

/**
 * Login GiDi: usuario en Postgres vía Prisma (tabla `User`), no Supabase Auth.
 * Contraseñas con hash bcrypt/bcryptjs (`$2a$` / `$2b$` / `$2y$`); compatibilidad con texto plano solo para datos legacy.
 *
 * Nota: `prisma["user"]` evita falsos positivos del analizador con `PrismaService` + pnpm; en runtime es el delegado estándar de Prisma.
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async passwordMatches(plain: string, stored: string | null): Promise<boolean> {
    const s = stored ?? "";
    if (!s) return false;
    if (/^\$2[aby]\$/.test(s)) {
      return bcrypt.compare(plain, s);
    }
    return s === plain;
  }

  async login(email: string, password: string) {
    const normalizedEmail = (email ?? "").toLowerCase().trim();
    const normalizedPassword = (password ?? "").trim();

    const user = await this.prisma["user"].findUnique({
      where: { email: normalizedEmail },
      include: { roles: { include: { role: true } } },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!(await this.passwordMatches(normalizedPassword, user.password))) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const roleKeys = user.roles.map((ur) => ur.role.key);
    const secret = process.env.JWT_SECRET?.trim() || "dev";

    const token = jwt.sign(
      { sub: user.id, email: user.email, roles: roleKeys },
      secret,
      { expiresIn: "7d" },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: roleKeys,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const cur = (currentPassword ?? "").trim();
    const next = (newPassword ?? "").trim();
    if (!next || next.length < 8) {
      throw new BadRequestException("La nueva contraseña debe tener al menos 8 caracteres.");
    }

    const user = await this.prisma["user"].findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Usuario inválido.");

    if (!(await this.passwordMatches(cur, user.password))) {
      throw new UnauthorizedException("Contraseña actual incorrecta.");
    }

    const hash = await bcrypt.hash(next, 12);

    await this.prisma["user"].update({
      where: { id: userId },
      data: {
        password: hash,
        mustChangePassword: false,
      },
    });

    return { ok: true };
  }
}
