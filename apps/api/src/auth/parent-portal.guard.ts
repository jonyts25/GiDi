import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { hasParentPortalAccess } from "./role-permissions";

@Injectable()
export class ParentPortalGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const userRoles: string[] = req.user?.roles ?? [];

    if (!hasParentPortalAccess(userRoles)) {
      throw new ForbiddenException("Acceso restringido al portal de padres");
    }

    return true;
  }
}
