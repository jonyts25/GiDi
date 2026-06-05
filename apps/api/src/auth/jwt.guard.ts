import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma.service";

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers["authorization"] as string | undefined;

    if (!auth || !auth.startsWith("Bearer ")) throw new UnauthorizedException("Missing Bearer token");
    const token = auth.slice("Bearer ".length).trim();

    try {
      const payload = await this.jwt.verifyAsync(token); // usa JWT_SECRET

      // Traemos roles del usuario desde DB
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          roles: { select: { role: { select: { key: true } } } },
        },
      });

      if (!user) throw new UnauthorizedException("User not found");

      req.user = {
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r) => r.role.key), // ["ADMIN", "THERAPIST", ...]
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
