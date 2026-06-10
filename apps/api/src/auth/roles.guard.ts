import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // Si no hay Roles() definidos, deja pasar
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user; // viene del JwtGuard
    const userRoles: string[] = user?.roles ?? [];
    const effectiveRoles = userRoles.includes("SUPERADMIN")
      ? [...userRoles, "ADMIN"]
      : userRoles;

    return requiredRoles.some((r) => effectiveRoles.includes(r));
  }
}
